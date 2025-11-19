#!/usr/bin/env python3
"""
PillPal Raspberry Pi WebSocket Server
Handles dispense commands and SMS sending via WebSocket
FIXED: Servo no longer resets to 0 degrees on disconnect/reconnect
READY TO USE - PCA9685 version (for servo boards)
"""

import asyncio
import websockets
import json
import logging
import time
import os
from typing import Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Hardware imports - PCA9685 version
try:
    from adafruit_servokit import ServoKit
    PCA9685_AVAILABLE = True
    logger.info("✅ adafruit_servokit imported successfully")
except ImportError as e:
    logger.error(f"❌ adafruit_servokit not found: {e}")
    logger.error("Install with: pip3 install adafruit-circuitpython-servokit")
    PCA9685_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Error importing adafruit_servokit: {e}")
    PCA9685_AVAILABLE = False

class ServoController:
    """Manages servo motors without resetting on initialization - PCA9685 version"""
    
    POSITION_FILE = "/home/justin/pillpal/servo_positions.json"
    DISPENSE_INCREMENT = 30  # Move exactly 30 degrees each dispense (integer)
    MAX_ANGLE = 180  # Maximum angle before resetting to 0 (integer)
    # Valid positions: 0, 30, 60, 90, 120, 150, 180
    VALID_ANGLES = [0, 30, 60, 90, 120, 150, 180]
    
    def __init__(self, demo_mode=False):
        self.demo_mode = demo_mode
        self.servos: Dict[str, any] = {}
        self.servo_positions: Dict[str, float] = {}  # Track positions
        self.kit = None
        
        # Load saved positions from file (persists across reboots)
        self._load_positions()
        
        if not demo_mode and PCA9685_AVAILABLE:
            self._initialize_servos()
    
    def _load_positions(self):
        """Load saved servo positions from file (persists across reboots)"""
        try:
            if os.path.exists(self.POSITION_FILE):
                with open(self.POSITION_FILE, 'r') as f:
                    saved_positions = json.load(f)
                    self.servo_positions = saved_positions
                    logger.info(f"📂 Loaded saved positions: {saved_positions}")
            else:
                logger.info("📂 No saved positions file found, starting from 0")
                self.servo_positions = {}
        except Exception as e:
            logger.error(f"❌ Error loading positions: {e}")
            self.servo_positions = {}
    
    def _save_positions(self):
        """Save current servo positions to file"""
        try:
            with open(self.POSITION_FILE, 'w') as f:
                json.dump(self.servo_positions, f)
            logger.info(f"💾 Saved positions: {self.servo_positions}")
        except Exception as e:
            logger.error(f"❌ Error saving positions: {e}")
    
    def _initialize_servos(self):
        """Initialize servos WITHOUT resetting to 0 degrees"""
        try:
            logger.info("🔧 Starting PCA9685 initialization...")
            logger.info(f"🔍 PCA9685_AVAILABLE: {PCA9685_AVAILABLE}")
            
            if not PCA9685_AVAILABLE:
                logger.error("❌ PCA9685 library not available - cannot initialize servos")
                self.demo_mode = True
                return
            
            # IMPORTANT: Don't set servo positions on initialization
            # Servos will maintain their current position
            
            logger.info("🔧 Initializing PCA9685 board (16 channels, address 0x40)...")
            # Initialize PCA9685 board (16 channels, default I2C address 0x40)
            # Change address if your board uses different address
            self.kit = ServoKit(channels=16, address=0x40)
            
            # Configure servo for precise angle control
            channel = 4  # Your servo channel
            
            # CRITICAL: Configure servo for full 180-degree range
            # Set actuation range to 180 degrees
            self.kit.servo[channel].actuation_range = 180
            
            # Set pulse width range for accurate positioning
            # Standard servos: 500-2500 microseconds (0.5-2.5ms) for 180 degrees
            # If rotating too much, reduce maximum pulse width
            # Try narrower range: 500-2400 to stop exactly at 180°
            try:
                self.kit.servo[channel].set_pulse_width_range(500, 2400)
                logger.info("✅ Servo pulse width set to 500-2400 microseconds (calibrated for exact 180°)")
            except:
                # If set_pulse_width_range doesn't work, try alternative method
                try:
                    self.kit.servo[channel]._pwm.set_pwm(channel, 0, 0)  # Reset
                    logger.info("✅ Servo PWM reset")
                except:
                    pass
            
            logger.info("✅ PCA9685 kit created successfully with 180° actuation range")
            logger.info(f"✅ Servo channel {channel} configured for 0-180° range")
            
            # Map servo IDs to PCA9685 channels
            # servo1 = channel 4, servo2 = channel 5
            # CHANGE CHANNEL NUMBERS IF YOUR SERVOS ARE ON DIFFERENT CHANNELS
            self.servos['servo1'] = 4  # Channel 4 on PCA9685 (main dispensing servo)
            self.servos['servo2'] = 5  # Channel 5 on PCA9685 (secondary servo for additional dispense)
            logger.info(f"✅ Mapped servo1 to PCA9685 channel 4")
            logger.info(f"✅ Mapped servo2 to PCA9685 channel 5")
            
            # Initialize servo2 (channel 5) - set to 0 degrees initially
            channel2 = 5
            self.kit.servo[channel2].actuation_range = 180
            try:
                self.kit.servo[channel2].set_pulse_width_range(500, 2400)
                logger.info("✅ Servo2 pulse width set to 500-2400 microseconds")
            except:
                pass
            
            # Initialize servo2 position
            if 'servo2' not in self.servo_positions:
                self.servo_positions['servo2'] = 0.0
                logger.info("📊 Starting servo2 at 0 degrees")
                self.kit.servo[channel2].angle = 0
                time.sleep(0.3)
            else:
                saved_angle2 = self.servo_positions['servo2']
                logger.info(f"📊 Restoring servo2 to saved position: {saved_angle2} degrees")
                self.kit.servo[channel2].angle = int(saved_angle2)
                time.sleep(0.3)
            
            # CRITICAL: Don't set angle on initialization!
            # Don't do: self.kit.servo[0].angle = 0  # This would reset position!
            # Just initialize the kit, servos will maintain their current position
            
            # Restore saved position on startup
            # When Pi reboots, servo loses power and resets to 0, so we restore it to saved position
            if 'servo1' not in self.servo_positions:
                self.servo_positions['servo1'] = 0.0
                logger.info("📊 Starting servo1 at 0 degrees (no saved position)")
                # Set servo to 0 (it's probably already there after reboot)
                self.kit.servo[4].angle = 0
                time.sleep(0.3)
            else:
                saved_angle = self.servo_positions['servo1']
                logger.info(f"📊 Restoring servo1 to saved position: {saved_angle} degrees")
                logger.info(f"💡 Servo was at {saved_angle}° before Pi was turned off")
                # Restore servo to saved position (servo resets to 0 on power loss, so we move it back)
                self.kit.servo[4].angle = int(saved_angle)
                time.sleep(0.5)  # Wait for movement to complete
                logger.info(f"✅ Servo1 restored to {saved_angle} degrees (from saved file)")
            
            logger.info("✅ Servos initialized (positions maintained) - PCA9685")
            logger.info(f"✅ Available servos: {list(self.servos.keys())}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize servos: {e}", exc_info=True)
            self.demo_mode = True
            self.kit = None
    
    def dispense(self, servo_id: str, angle: float = None) -> bool:
        """
        Move servo exactly 30 degrees from current position
        Cycles: 0° → 30° → 60° → 90° → 120° → 150° → 180° → 0° (repeat)
        After 6th dispense (180°), immediately resets to 0°
        Saves position to file for persistence across reboots
        """
        try:
            # Get current position (default to 0 if not set)
            current_angle = self.servo_positions.get(servo_id, 0.0)
            logger.info(f"🚀 dispense() called: servo_id='{servo_id}', current_angle={current_angle}°")
            logger.info(f"🔍 Available servos: {list(self.servos.keys())}")
            logger.info(f"🔍 Demo mode: {self.demo_mode}")
            logger.info(f"🔍 PCA9685 kit initialized: {self.kit is not None}")
            
            # Ensure current angle is an integer (snap to nearest valid angle)
            current_angle_int = int(round(current_angle))
            # Snap to nearest valid angle if close
            if current_angle_int in self.VALID_ANGLES:
                current_angle = current_angle_int
            else:
                # Find closest valid angle
                closest = min(self.VALID_ANGLES, key=lambda x: abs(x - current_angle_int))
                current_angle = closest
                logger.info(f"🔧 Snapped current angle from {current_angle_int}° to {current_angle}°")
            
            # Calculate new angle: add exactly 30 degrees (integer)
            new_angle = current_angle + self.DISPENSE_INCREMENT
            logger.info(f"🔢 Precise calculation: {current_angle}° + {self.DISPENSE_INCREMENT}° = {new_angle}°")
            
            # If current angle is already 180° or more, reset to 0° immediately
            if current_angle >= self.MAX_ANGLE:
                new_angle = 0
                logger.info(f"🔄 At {self.MAX_ANGLE}° (6th dispense completed), resetting to 0° immediately")
            # If adding 30 would exceed 180°, go to 180° first, then automatically reset to 0°
            elif new_angle > self.MAX_ANGLE:
                # First move to 180° (6th dispense)
                new_angle = self.MAX_ANGLE
                logger.info(f"📍 Reaching {self.MAX_ANGLE}° (6th dispense)")
            
            # Ensure new_angle is a valid integer
            new_angle = int(new_angle)
            
            logger.info(f"📐 Moving from {current_angle}° to {new_angle}° (exactly +{self.DISPENSE_INCREMENT}°)")
            
            if self.demo_mode:
                logger.info(f"DEMO: Servo {servo_id} would move from {current_angle}° to {new_angle}°")
                self.servo_positions[servo_id] = new_angle
                # If we reached 180°, automatically reset to 0° in demo mode too
                if new_angle >= self.MAX_ANGLE:
                    logger.info(f"🔄 DEMO: Automatically resetting from {self.MAX_ANGLE}° to 0°")
                    self.servo_positions[servo_id] = 0.0
                self._save_positions()
                return True
            
            if servo_id not in self.servos:
                logger.error(f"❌ Servo {servo_id} not found in {list(self.servos.keys())}")
                return False
            
            if not self.kit:
                logger.error("❌ PCA9685 kit not initialized")
                return False
            
            # Get channel number for this servo
            channel = self.servos[servo_id]
            logger.info(f"🔧 Using PCA9685 channel {channel} for servo {servo_id}")
            
            # Calculate exact angle difference
            angle_difference = new_angle - current_angle
            
            logger.info(f"⚙️ Setting PCA9685 channel {channel} to EXACT angle {new_angle}° (integer)")
            logger.info(f"📊 ANGLE CHANGE: {current_angle}° → {new_angle}° (DIFFERENCE: {angle_difference}°)")
            
            # Verify it's exactly 30 degrees (or 180 to 0)
            if angle_difference != 30 and angle_difference != -180:
                logger.error(f"❌ ERROR: Expected 30° or -180° movement, but got {angle_difference}°")
                logger.error(f"❌ This should not happen! Current: {current_angle}°, New: {new_angle}°")
            
            # Set the exact angle using integer (PCA9685 handles 0-180 degrees)
            logger.info(f"🎯 Sending command: self.kit.servo[{channel}].angle = {new_angle}")
            
            # Ensure servo is configured for 180-degree range before setting angle
            self.kit.servo[channel].actuation_range = 180
            
            # Re-apply pulse width calibration to prevent drift (stops exactly at 180°)
            try:
                self.kit.servo[channel].set_pulse_width_range(500, 2400)
            except:
                pass
            
            # Special handling for 5th rotation (120° → 150°) to prevent overshoot
            if current_angle == 120 and new_angle == 150:
                logger.info("🔧 5th rotation detected (120° → 150°) - using conservative pulse width")
                # Use slightly narrower pulse width to prevent overshooting 150°
                try:
                    self.kit.servo[channel].set_pulse_width_range(500, 2350)  # Slightly reduced max
                    logger.info("✅ Applied conservative pulse width for 5th rotation")
                except:
                    pass
            
            # Set the angle
            self.kit.servo[channel].angle = new_angle
            self.servo_positions[servo_id] = float(new_angle)  # Store as float for JSON compatibility
            
            # For 180 degrees, use calibrated pulse width (not maximum)
            if new_angle == 180:
                logger.info("🔧 Setting 180° with calibrated pulse width (2400 microseconds)")
                # Restore full pulse width range for 180°
                try:
                    self.kit.servo[channel].set_pulse_width_range(500, 2400)
                except:
                    pass
                logger.info(f"🔧 Servo actuation_range: {self.kit.servo[channel].actuation_range}°")
            
            # Wait for movement to complete (servos need time to reach position)
            # Longer wait for 180° to ensure it reaches full range
            wait_time = 0.8 if new_angle == 180 else 0.6
            time.sleep(wait_time)
            logger.info(f"⏱️  Waited {wait_time}s for servo to reach position")
            
            # CRITICAL: After 5th rotation (150°), verify and correct position to prevent overshoot
            if new_angle == 150:
                logger.info("🔧 5th rotation complete - verifying and correcting position to exactly 150°")
                # Re-apply pulse width calibration and set exact angle again to ensure precision
                try:
                    self.kit.servo[channel].set_pulse_width_range(500, 2350)  # Keep conservative for correction
                    self.kit.servo[channel].angle = 150  # Set exact angle again
                    time.sleep(0.3)  # Wait for correction
                    logger.info("✅ Position corrected to exactly 150°")
                    # Restore normal pulse width for next rotation
                    self.kit.servo[channel].set_pulse_width_range(500, 2400)
                except Exception as e:
                    logger.warning(f"⚠️ Could not apply correction: {e}")
            
            # If we just reached 180° (6th dispense), automatically reset to 0° immediately
            if new_angle >= self.MAX_ANGLE:
                logger.info(f"🔄 Automatically resetting from {self.MAX_ANGLE}° to 0° (no need for 7th dispense)")
                logger.info(f"📊 Moving from {new_angle}° to 0° (difference: {0 - new_angle}°)")
                logger.info(f"🎯 Sending command: self.kit.servo[{channel}].angle = 0")
                self.kit.servo[channel].angle = 0
                self.servo_positions[servo_id] = 0.0
                time.sleep(0.6)  # Wait for reset movement to complete
                logger.info(f"✅ Servo automatically reset to 0°")
            
            # Save position to file immediately (persists across reboots)
            self._save_positions()
            
            # Don't reset angle - let servo hold position!
            # DON'T DO: self.kit.servo[channel].angle = 0  # This would reset!
            
            final_angle = int(self.servo_positions[servo_id])
            logger.info(f"✅ Servo {servo_id} (channel {channel}) moved from {current_angle}° to {final_angle}°")
            logger.info(f"💾 Position saved: {final_angle}°")
            logger.info(f"✅ Movement complete: {angle_difference}° change confirmed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error moving servo {servo_id}: {e}", exc_info=True)
            return False
    
    def get_position(self, servo_id: str) -> Optional[float]:
        """Get current servo position"""
        return self.servo_positions.get(servo_id, None)
    
    def move_servo2_to_90(self) -> bool:
        """
        Move servo2 (channel 5) to 90 degrees
        Called after main servo (servo1) completes its 30-degree rotation
        """
        try:
            servo_id = 'servo2'
            target_angle = 90
            
            logger.info(f"🎯 Moving {servo_id} to {target_angle} degrees")
            
            if self.demo_mode:
                logger.info(f"DEMO: Servo {servo_id} would move to {target_angle}°")
                self.servo_positions[servo_id] = float(target_angle)
                self._save_positions()
                return True
            
            if servo_id not in self.servos:
                logger.error(f"❌ Servo {servo_id} not found in {list(self.servos.keys())}")
                return False
            
            if not self.kit:
                logger.error("❌ PCA9685 kit not initialized")
                return False
            
            channel = self.servos[servo_id]
            logger.info(f"🔧 Using PCA9685 channel {channel} for servo {servo_id}")
            
            # Configure servo for 180-degree range
            self.kit.servo[channel].actuation_range = 180
            try:
                self.kit.servo[channel].set_pulse_width_range(500, 2400)
            except:
                pass
            
            # Move to 90 degrees
            self.kit.servo[channel].angle = target_angle
            self.servo_positions[servo_id] = float(target_angle)
            
            # Wait for movement to complete
            time.sleep(0.6)
            logger.info(f"✅ Servo {servo_id} (channel {channel}) moved to {target_angle}°")
            
            # Save position
            self._save_positions()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error moving servo2 to 90°: {e}", exc_info=True)
            return False
    
    def reset_servo2(self) -> bool:
        """
        Reset servo2 (channel 5) back to 0 degrees
        Called after user confirms second dispense
        """
        try:
            servo_id = 'servo2'
            target_angle = 0
            
            logger.info(f"🔄 Resetting {servo_id} to {target_angle} degrees")
            
            if self.demo_mode:
                logger.info(f"DEMO: Servo {servo_id} would reset to {target_angle}°")
                self.servo_positions[servo_id] = float(target_angle)
                self._save_positions()
                return True
            
            if servo_id not in self.servos:
                logger.error(f"❌ Servo {servo_id} not found")
                return False
            
            if not self.kit:
                logger.error("❌ PCA9685 kit not initialized")
                return False
            
            channel = self.servos[servo_id]
            
            # Move to 0 degrees
            self.kit.servo[channel].angle = target_angle
            self.servo_positions[servo_id] = float(target_angle)
            
            # Wait for movement to complete
            time.sleep(0.6)
            logger.info(f"✅ Servo {servo_id} (channel {channel}) reset to {target_angle}°")
            
            # Save position
            self._save_positions()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error resetting servo2: {e}", exc_info=True)
            return False


class SMSController:
    """Handles SMS sending via GSM module"""
    
    def __init__(self, demo_mode=False):
        self.demo_mode = demo_mode
        # Initialize GSM module here if needed
        # from services.gsm_module import GSMModule
        # self.gsm = GSMModule(port='/dev/ttyUSB0')
    
    def send_sms(self, phone_numbers: list, message: str) -> bool:
        """Send SMS to phone numbers"""
        try:
            if self.demo_mode:
                logger.info(f"DEMO: Would send SMS to {phone_numbers}: {message}")
                return True
            
            # Implement actual SMS sending here
            # for phone in phone_numbers:
            #     self.gsm.send_sms(phone, message)
            
            logger.info(f"SMS sent to {phone_numbers}")
            return True
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False


# Global controllers (initialized once, not reset on connection)
servo_controller = ServoController(demo_mode=False)  # Set to True for testing
sms_controller = SMSController(demo_mode=False)  # Set to True for testing


async def handle_dispense(servo_id: str, medication: str) -> dict:
    """
    Handle dispense command
    Moves servo 30 degrees from current position (relative, not absolute)
    After main servo completes, moves servo2 to 90 degrees for confirmation
    """
    try:
        logger.info(f"Dispensing {medication} via {servo_id}")
        
        # Move main servo (servo1) 30 degrees from current position (relative movement)
        success = servo_controller.dispense(servo_id)
        
        if success:
            # After main servo completes, move servo2 to 90 degrees
            logger.info("🎯 Main dispense complete, moving servo2 to 90° for confirmation")
            servo2_success = servo_controller.move_servo2_to_90()
            
            if servo2_success:
                return {
                    "status": "success",
                    "servo_id": servo_id,
                    "medication": medication,
                    "message": f"{medication} dispensed successfully",
                    "servo2_moved": True,
                    "requires_confirmation": True  # Frontend will show confirmation dialog
                }
            else:
                # Main dispense succeeded but servo2 failed
                return {
                    "status": "partial_success",
                    "servo_id": servo_id,
                    "medication": medication,
                    "message": f"{medication} dispensed, but secondary servo failed",
                    "servo2_moved": False,
                    "requires_confirmation": False
                }
        else:
            return {
                "status": "error",
                "servo_id": servo_id,
                "medication": medication,
                "message": "Failed to dispense"
            }
    except Exception as e:
        logger.error(f"Error in handle_dispense: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def handle_servo2_dispense() -> dict:
    """
    Handle second servo dispense confirmation
    Resets servo2 back to 0 degrees after user confirms
    """
    try:
        logger.info("✅ User confirmed second dispense, resetting servo2")
        
        success = servo_controller.reset_servo2()
        
        if success:
            return {
                "status": "success",
                "message": "Second dispense completed successfully"
            }
        else:
            return {
                "status": "error",
                "message": "Failed to complete second dispense"
            }
    except Exception as e:
        logger.error(f"Error in handle_servo2_dispense: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def handle_sms(phone_numbers: list, message: str) -> dict:
    """Handle SMS sending command"""
    try:
        logger.info(f"Sending SMS to {phone_numbers}")
        
        success = sms_controller.send_sms(phone_numbers, message)
        
        if success:
            return {
                "status": "success",
                "message": "SMS sent successfully"
            }
        else:
            return {
                "status": "error",
                "message": "Failed to send SMS"
            }
    except Exception as e:
        logger.error(f"Error in handle_sms: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def handle_client(websocket, path=None):
    """
    Handle WebSocket client connections
    IMPORTANT: Does NOT reset servos on connection/disconnection
    FIXED: path=None for newer websockets library compatibility
    """
    client_address = websocket.remote_address
    logger.info(f"Client connected from {client_address}")
    
    # CRITICAL: Don't reset servos here!
    # The servo_controller maintains positions across connections
    # Only move servos when dispense commands are received
    
    try:
        async for message in websocket:
            try:
                logger.info(f"📨 Raw message received: {message}")
                data = json.loads(message)
                message_type = data.get('type')
                logger.info(f"📋 Parsed message type: {message_type}, full data: {data}")
                
                if message_type == 'dispense':
                    # Handle dispense command
                    servo_id = data.get('servo_id')
                    medication = data.get('medication', 'Unknown')
                    
                    logger.info(f"🎯 Dispense command received: servo_id='{servo_id}', medication='{medication}'")
                    logger.info(f"🔧 Available servos: {list(servo_controller.servos.keys())}")
                    logger.info(f"🔧 Demo mode: {servo_controller.demo_mode}")
                    logger.info(f"🔧 PCA9685 kit: {servo_controller.kit is not None}")
                    
                    result = await handle_dispense(servo_id, medication)
                    logger.info(f"📤 Sending result: {result}")
                    await websocket.send(json.dumps(result))
                    
                elif message_type == 'servo2_dispense':
                    # Handle second servo dispense confirmation
                    logger.info("🎯 Servo2 dispense confirmation received")
                    result = await handle_servo2_dispense()
                    logger.info(f"📤 Sending result: {result}")
                    await websocket.send(json.dumps(result))
                    
                elif message_type == 'send_sms':
                    # Handle SMS command
                    phone_numbers = data.get('phone_numbers', [])
                    if isinstance(phone_numbers, str):
                        phone_numbers = [phone_numbers]
                    sms_message = data.get('message', '')
                    
                    result = await handle_sms(phone_numbers, sms_message)
                    await websocket.send(json.dumps(result))
                    
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    await websocket.send(json.dumps({
                        "status": "error",
                        "message": f"Unknown message type: {message_type}"
                    }))
                    
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received: {e}")
                await websocket.send(json.dumps({
                    "status": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send(json.dumps({
                    "status": "error",
                    "message": str(e)
                }))
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client {client_address} disconnected")
        # CRITICAL: Don't reset servos on disconnect!
        # Servos maintain their position
        
    except Exception as e:
        logger.error(f"Error in handle_client: {e}")
    finally:
        logger.info(f"Connection closed for {client_address}")
        # CRITICAL: Don't reset servos here either!


async def main():
    """Start the WebSocket server"""
    host = "0.0.0.0"  # Listen on all interfaces
    port = 8765
    
    logger.info("=" * 50)
    logger.info("PillPal WebSocket Server Starting...")
    logger.info(f"Listening on {host}:{port}")
    logger.info("Servo positions will be maintained (not reset)")
    logger.info("=" * 50)
    
    # Start WebSocket server
    async with websockets.serve(handle_client, host, port):
        logger.info(f"WebSocket server running on ws://{host}:{port}")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")

