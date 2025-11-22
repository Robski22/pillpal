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
from datetime import datetime, timedelta

# Serial import for SIMCOM module (optional - only needed if SIMCOM is connected)
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    logger.warning("⚠️ pyserial not installed. Install with: pip3 install pyserial")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# GPIO imports for button (GPIO26) and LEDs (GPIO27, GPIO22)
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    logger.info("✅ RPi.GPIO imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ RPi.GPIO not found: {e}")
    logger.warning("GPIO button and LED functionality will be disabled")
    GPIO_AVAILABLE = False
except Exception as e:
    logger.warning(f"⚠️ Error importing RPi.GPIO: {e}")
    GPIO_AVAILABLE = False

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

# LCD imports - I2C LCD (address 0x27)
try:
    import smbus
    from RPLCD.i2c import CharLCD
    LCD_AVAILABLE = True
    logger.info("✅ RPLCD imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ RPLCD not found: {e}")
    logger.warning("LCD functionality will be disabled")
    logger.warning("Install with: pip3 install RPLCD")
    LCD_AVAILABLE = False
except Exception as e:
    logger.warning(f"⚠️ Error importing RPLCD: {e}")
    LCD_AVAILABLE = False

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
            # Servo2 moves COUNTER-CLOCKWISE (reversed direction)
            channel2 = 5
            self.kit.servo[channel2].actuation_range = 180
            try:
                # REVERSED pulse width for counter-clockwise movement
                # 2400-500 instead of 500-2400 reverses the direction
                self.kit.servo[channel2].set_pulse_width_range(2400, 500)
                logger.info("✅ Servo2 pulse width set to 2400-500 microseconds (COUNTER-CLOCKWISE)")
            except:
                pass
            
            # Initialize servo2 position - always start at 3° (optimal resting position)
            # Servo2 should always be at 3° when not dispensing medicine
            self.kit.servo[channel2].angle = 3
            self.servo_positions['servo2'] = 3.0
            logger.info("📊 Starting servo2 at 3 degrees (optimal resting position, counter-clockwise mode)")
            time.sleep(0.3)
            logger.info("✅ Servo2 initialized at 3° - ready for medicine dispense (COUNTER-CLOCKWISE)")
            
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
                
                # CRITICAL: Ensure servo is properly configured before restoring
                # Wait a bit for PCA9685 to fully initialize
                time.sleep(0.5)
                
                # Re-apply calibration before restoring position
                self.kit.servo[4].actuation_range = 180
                try:
                    self.kit.servo[4].set_pulse_width_range(500, 2400)
                    logger.info("✅ Servo calibration applied before restore")
                except Exception as e:
                    logger.warning(f"⚠️ Could not set pulse width: {e}")
                
                # Restore servo to saved position (servo resets to 0 on power loss, so we move it back)
                logger.info(f"🎯 Moving servo from 0° to {saved_angle}° (restore after reboot)")
                self.kit.servo[4].angle = int(saved_angle)
                
                # Wait longer for movement to complete (servo needs time to move from 0 to saved position)
                wait_time = 1.0 if saved_angle >= 90 else 0.8
                time.sleep(wait_time)
                
                # Verify by setting the angle again (ensures it's at correct position)
                self.kit.servo[4].angle = int(saved_angle)
                time.sleep(0.3)
                
                logger.info(f"✅ Servo1 restored to {saved_angle} degrees (from saved file)")
                logger.info(f"✅ Physical servo should now be at {saved_angle}° (not 0°)")
            
            # Note: LEDs will be updated in main() after all controllers are initialized
            
            logger.info("✅ Servos initialized (positions maintained) - PCA9685")
            logger.info(f"✅ Available servos: {list(self.servos.keys())}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize servos: {e}", exc_info=True)
            self.demo_mode = True
            self.kit = None
    
    def dispense(self, servo_id: str, angle: float = None, target_angle: float = None) -> bool:
        """
        Move servo to target angle (progressive dispense logic)
        If target_angle is provided, move to that specific angle
        Otherwise, move exactly 30 degrees from current position (legacy behavior)
        Cycles: 0° → 30° → 60° → 90° → 120° → 150° → 180° → 0° (repeat)
        After 6th dispense (180°), resets to 0°
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
            
            # Time frame dispense logic: use target_angle if provided (direct movement to time frame angle)
            if target_angle is not None:
                # Frontend calculated the target angle based on time frame
                # Saturday Morning=30°, Afternoon=60°, Evening=90°
                # Sunday Morning=120°, Afternoon=150°, Evening=180°
                new_angle = int(round(target_angle))
                logger.info(f"🎯 Time frame dispense: Moving directly to target angle {new_angle}° (from frontend time frame mapping)")
                # Ensure target angle is valid
                if new_angle not in self.VALID_ANGLES and new_angle != 0:
                    # Snap to nearest valid angle
                    closest = min(self.VALID_ANGLES, key=lambda x: abs(x - new_angle))
                    new_angle = closest
                    logger.info(f"🔧 Snapped target angle to {new_angle}°")
            else:
                # Legacy behavior: add exactly 30 degrees (integer)
                new_angle = current_angle + self.DISPENSE_INCREMENT
                logger.info(f"🔢 Legacy calculation: {current_angle}° + {self.DISPENSE_INCREMENT}° = {new_angle}°")
                
                # If current angle is already 180° or more, reset to 0° immediately
                if current_angle >= self.MAX_ANGLE:
                    new_angle = 0
                    logger.info(f"🔄 At {self.MAX_ANGLE}° (6th dispense completed), resetting to 0° immediately")
                # If adding 30 would exceed 180°, go to 180° first
                elif new_angle > self.MAX_ANGLE:
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
            
            # If we just reached 180° (6th dispense), DON'T auto-reset - wait for user confirmation
            # Servo1 will stay at 180° until user confirms via servo2 dialog
            if new_angle >= self.MAX_ANGLE:
                logger.info(f"🔄 Reached {self.MAX_ANGLE}° (6th dispense) - waiting for user confirmation")
                logger.info(f"💡 Servo1 will stay at 180° until user confirms. Then it will reset to 0°")
            
            # Save position to file immediately (persists across reboots)
            self._save_positions()
            
            # Update LEDs based on new position (will be available at runtime)
            # Note: led_controller is global, accessed after initialization
            
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
    
    def move_servo2_to_100(self) -> bool:
        """
        Move servo2 (channel 5) to 100 degrees COUNTER-CLOCKWISE (from current position)
        Called after main servo (servo1) completes its 30-degree rotation
        Servo2 moves 100 degrees counter-clockwise FAST for quick dispense
        Then stays at 100° for 2 seconds before returning to 3°
        """
        try:
            servo_id = 'servo2'
            current_angle = self.servo_positions.get(servo_id, 3.0)  # Default to 3° if not set
            target_angle = 100  # Always move to 100° (from wherever it is)
            
            logger.info(f"🎯 Moving {servo_id} COUNTER-CLOCKWISE SMOOTHLY from {current_angle}° to {target_angle} degrees (MG90S - smooth movement)")
            
            if self.demo_mode:
                logger.info(f"DEMO: Servo {servo_id} would move COUNTER-CLOCKWISE SLOWLY from {current_angle}° to {target_angle}°")
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
            logger.info(f"🔧 Using PCA9685 channel {channel} for servo {servo_id} (COUNTER-CLOCKWISE, SLOW)")
            
            # Configure servo for 180-degree range with REVERSED pulse width (counter-clockwise)
            self.kit.servo[channel].actuation_range = 180
            try:
                # REVERSED pulse width: 2400-500 instead of 500-2400 for counter-clockwise movement
                self.kit.servo[channel].set_pulse_width_range(2400, 500)
                logger.info("🔄 Servo2 pulse width reversed for counter-clockwise movement")
            except:
                pass
            
            # FAST MOVEMENT: Move in larger increments with minimal delays for fast dispense
            # Move from current_angle to target_angle in 10-degree increments for fast movement
            start_angle = int(current_angle)
            step_size = 10  # Larger steps for faster movement
            steps = abs(target_angle - start_angle) // step_size
            if steps == 0:
                steps = 1  # At least one step
            
            logger.info(f"⚡ Moving fast: {start_angle}° → {target_angle}° in {steps} steps ({step_size}° per step)")
            
            # Fast movement - larger steps, minimal delays
            for step in range(1, steps + 1):
                intermediate_angle = start_angle + (target_angle - start_angle) * step // steps
                if intermediate_angle > target_angle:
                    intermediate_angle = target_angle
                
                self.kit.servo[channel].angle = intermediate_angle
                time.sleep(0.02)  # 20ms delay - very fast movement
            
            # Final position
            self.kit.servo[channel].angle = target_angle
            self.servo_positions[servo_id] = float(target_angle)
            
            # Wait for movement to complete
            time.sleep(0.05)
            logger.info(f"✅ Servo {servo_id} (channel {channel}) moved COUNTER-CLOCKWISE FAST to {target_angle}°")
            
            # Save position
            self._save_positions()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error moving servo2 to 100°: {e}", exc_info=True)
            return False
    
    def reset_servo2(self) -> bool:
        """
        Reset servo2 (channel 5) back to 3 degrees (counter-clockwise return, FAST)
        Called after servo2 has been at 100° for 2 seconds
        Returns servo2 to its optimal resting position (3°) moving counter-clockwise FAST
        Fast movement for quick dispense cycle
        """
        try:
            servo_id = 'servo2'
            current_angle = self.servo_positions.get(servo_id, 100.0)
            target_angle = 3  # Optimal resting position
            
            logger.info(f"🔄 Returning {servo_id} COUNTER-CLOCKWISE SLOWLY from {current_angle}° to {target_angle}° (resting position, MG90S)")
            
            if self.demo_mode:
                logger.info(f"DEMO: Servo {servo_id} would return COUNTER-CLOCKWISE SLOWLY to {target_angle}°")
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
            
            # Configure servo with REVERSED pulse width (counter-clockwise)
            self.kit.servo[channel].actuation_range = 180
            try:
                # REVERSED pulse width: 2400-500 for counter-clockwise movement
                self.kit.servo[channel].set_pulse_width_range(2400, 500)
                logger.info("🔄 Servo2 pulse width reversed for counter-clockwise return")
            except:
                pass
            
            # FAST RETURN: Move in larger increments with minimal delays for fast return
            start_angle = int(current_angle)
            step_size = 10  # Larger steps for faster movement
            steps = abs(start_angle - target_angle) // step_size
            if steps == 0:
                steps = 1  # At least one step
            
            logger.info(f"⚡ Returning fast: {start_angle}° → {target_angle}° in {steps} steps ({step_size}° per step)")
            
            # Fast movement - larger steps, minimal delays
            for step in range(1, steps + 1):
                # Calculate intermediate angle (moving from start_angle down to target_angle)
                intermediate_angle = start_angle - (start_angle - target_angle) * step // steps
                # Clamp angle to never go below 3° (resting position)
                if intermediate_angle < 3:
                    intermediate_angle = 3
                # Ensure we don't go below target (3°)
                if intermediate_angle < target_angle:
                    intermediate_angle = target_angle
                
                self.kit.servo[channel].angle = intermediate_angle
                time.sleep(0.02)  # 20ms delay - very fast movement
            
            # Final position - ensure it's exactly 3° (resting position)
            final_angle = max(3, target_angle)  # Resting position is 3°
            self.kit.servo[channel].angle = final_angle
            self.servo_positions[servo_id] = float(final_angle)
            
            # Wait for movement to complete
            time.sleep(0.1)
            
            # Set to 3° one more time to ensure it's at rest position
            self.kit.servo[channel].angle = 3
            time.sleep(0.1)
            
            logger.info(f"✅ Servo {servo_id} (channel {channel}) returned FAST to {final_angle}° and STOPPED (resting position)")
            
            # Save position
            self._save_positions()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error resetting servo2: {e}", exc_info=True)
            return False


class SMSController:
    """Handles SMS sending via SIMCOM module (SIM800L/SIM900A)"""
    
    def __init__(self, demo_mode=False, serial_port='/dev/ttyUSB0', baudrate=115200):
        self.demo_mode = demo_mode
        self.serial_port = serial_port
        self.baudrate = baudrate  # Default to 115200 (most SIMCOM modules use this)
        self.serial = None
        self.sim_inserted = False
        self.signal_strength = 0
        self.last_sms_time = 0  # Track last SMS time to prevent too frequent sends
        
        if not demo_mode:
            self._initialize_simcom()
    
    def _initialize_simcom(self):
        """Initialize SIMCOM module and check status"""
        try:
            if not SERIAL_AVAILABLE:
                logger.warning("⚠️ pyserial not available. SMS functionality disabled.")
                return
            
            # Try to find SIMCOM module port
            if SERIAL_AVAILABLE:
                ports = serial.tools.list_ports.comports()
            else:
                ports = []
            simcom_port = None
            
            # Check common ports
            common_ports = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyAMA0', '/dev/ttyS0']
            for port in common_ports:
                if os.path.exists(port):
                    simcom_port = port
                    break
            
            # If not found, try to find USB serial devices
            if not simcom_port:
                for port in ports:
                    if 'USB' in port.device or 'ttyUSB' in port.device:
                        simcom_port = port.device
                        break
            
            if not simcom_port:
                logger.warning("⚠️ SIMCOM module not found. SMS functionality disabled.")
                return
            
            self.serial_port = simcom_port
            logger.info(f"📱 Connecting to SIMCOM module at {simcom_port}...")
            
            # Try different baud rates (most SIMCOM modules use 115200)
            baud_rates = [115200, 9600, 57600, 38400]
            self.serial = None
            working_baud = None
            
            for baud in baud_rates:
                try:
                    logger.info(f"   Trying baud rate {baud}...")
                    test_serial = serial.Serial(
                        port=simcom_port,
                        baudrate=baud,
                        timeout=3,
                        writeTimeout=3
                    )
                    time.sleep(2)  # Wait for module to initialize
                    
                    # Test AT command
                    test_serial.reset_input_buffer()
                    test_serial.write(b"AT\r\n")
                    time.sleep(0.5)
                    
                    response = ""
                    start_time = time.time()
                    while time.time() - start_time < 2:
                        if test_serial.in_waiting > 0:
                            response += test_serial.read(test_serial.in_waiting).decode('utf-8', errors='ignore')
                            if 'OK' in response:
                                break
                        time.sleep(0.1)
                    
                    if 'OK' in response:
                        logger.info(f"   ✅ Module responding at {baud} baud!")
                        self.serial = test_serial
                        self.baudrate = baud
                        working_baud = baud
                        break
                    else:
                        test_serial.close()
                        logger.debug(f"   No response at {baud} baud")
                except Exception as e:
                    logger.debug(f"   Error at {baud} baud: {e}")
                    if test_serial and not test_serial.closed:
                        test_serial.close()
            
            if not self.serial:
                logger.error(f"❌ Could not establish communication with SIMCOM module at {simcom_port}")
                logger.error("   Tried baud rates: " + ", ".join(map(str, baud_rates)))
                logger.error("   Check: power, USB connection, or try different port")
                return
            
            logger.info(f"✅ Connected at {working_baud} baud")
            
            # Send basic AT command to wake up module
            self._send_at_command("AT")
            time.sleep(0.5)
            
            # Set SMS text mode (should be done once at startup)
            self._send_at_command("AT+CMGF=1")
            time.sleep(0.5)
            
            # Try to set sender name to "PillPal" via phonebook
            # This stores "PillPal" as the device name (some carriers use this as sender name)
            try:
                # Store "PillPal" in SIM phonebook at position 1 (if supported)
                # AT+CPBW writes to phonebook: AT+CPBW=<index>,"<number>",<type>,"<name>"
                # We'll try to set it, but it may not work on all carriers
                self._send_at_command('AT+CPBW=1,"PillPal",129,"PillPal"')
                time.sleep(0.3)
                logger.info("📱 Attempted to set sender name to 'PillPal'")
            except Exception as e:
                logger.debug(f"Could not set sender name (this is normal): {e}")
            
            # Note: Sender name is usually controlled by the carrier/SIM card
            # The phonebook method above may not work on all carriers
            # Some carriers allow setting via AT+CSCA (service center), but that's carrier-specific
            
            # Check if SIM card is inserted
            self._check_sim_status()
            
            # Check signal strength
            self._check_signal()
            
            logger.info(f"✅ SIMCOM module initialized: SIM={'Inserted' if self.sim_inserted else 'Not found'}, Signal={self.signal_strength}")
            
        except ImportError:
            logger.warning("⚠️ pyserial not installed. Install with: pip3 install pyserial")
            self.serial = None
        except Exception as e:
            logger.error(f"❌ Error initializing SIMCOM: {e}")
            self.serial = None
    
    def _cancel_any_pending_sms(self):
        """Cancel any pending SMS operation (if module is stuck waiting for input)"""
        try:
            # Send Ctrl+C (0x03) multiple times to ensure cancellation
            for _ in range(3):
                self.serial.write(b'\x03')
                time.sleep(0.2)
            
            # Send ESC (0x1B) as well
            self.serial.write(b'\x1B')
            time.sleep(0.2)
            
            # Clear buffers completely
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()
            time.sleep(0.3)
            
            if self.serial.in_waiting > 0:
                self.serial.read(self.serial.in_waiting)
            
            # Send AT command to reset module state
            try:
                self._send_at_command("AT", timeout=2)
            except:
                pass
        except:
            pass
    
    def _send_at_command(self, command: str, timeout=3, wait_for_prompt=False) -> str:
        """Send AT command and wait for response"""
        if not self.serial or self.serial.closed:
            return ""
        
        try:
            # CRITICAL: Clear buffer completely before sending
            self.serial.reset_input_buffer()
            time.sleep(0.15)
            
            # Clear any leftover data
            if self.serial.in_waiting > 0:
                self.serial.read(self.serial.in_waiting)
            time.sleep(0.15)
            
            # Send command
            self.serial.write(f"{command}\r\n".encode())
            time.sleep(0.25)  # Give module time to process
            
            # Read response
            response = ""
            start_time = time.time()
            while time.time() - start_time < timeout:
                if self.serial.in_waiting > 0:
                    chunk = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                    response += chunk
                    
                    # If waiting for prompt (for CMGS), look for ">"
                    if wait_for_prompt:
                        if '>' in response:
                            break
                        # Sometimes we get CMGS confirmation instead of prompt
                        if '+CMGS:' in response:
                            break
                    else:
                        # For regular commands, wait for OK or ERROR
                        if 'OK' in response or 'ERROR' in response:
                            break
                time.sleep(0.1)
            
            # Read any remaining data (important for prompt detection)
            if wait_for_prompt and '>' not in response:
                # Wait longer and read multiple times for prompt
                for wait_attempt in range(3):
                    time.sleep(0.8)  # Wait 0.8 seconds
                    if self.serial.in_waiting > 0:
                        additional = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                        response += additional
                        if '>' in additional:
                            break
            
            # Clear any remaining data after reading
            time.sleep(0.15)
            if self.serial.in_waiting > 0:
                self.serial.read(self.serial.in_waiting)
            
            return response.strip()
        except Exception as e:
            logger.error(f"Error sending AT command {command}: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def _check_sim_status(self) -> bool:
        """Check if SIM card is inserted"""
        try:
            if not self.serial:
                return False
            
            # Check SIM card status
            response = self._send_at_command("AT+CPIN?")
            if "READY" in response:
                self.sim_inserted = True
                logger.info("✅ SIM card detected and ready")
                return True
            elif "SIM PIN" in response:
                logger.warning("⚠️ SIM card requires PIN")
                self.sim_inserted = False
                return False
            elif "SIM PUK" in response:
                logger.error("❌ SIM card is locked (PUK required)")
                self.sim_inserted = False
                return False
            else:
                logger.warning("⚠️ SIM card not detected")
                self.sim_inserted = False
                return False
        except Exception as e:
            logger.error(f"Error checking SIM status: {e}")
            self.sim_inserted = False
            return False
    
    def _check_signal(self) -> int:
        """Check signal strength (0-31, where 0 is no signal)"""
        try:
            if not self.serial:
                return 0
            
            response = self._send_at_command("AT+CSQ")
            # Response format: +CSQ: <rssi>,<ber>
            # rssi: 0-31 (99 = unknown/not detectable)
            if "+CSQ:" in response:
                parts = response.split("+CSQ:")[1].split(",")[0].strip()
                try:
                    rssi = int(parts)
                    if rssi == 99:
                        self.signal_strength = 0
                        logger.warning("⚠️ Signal strength: Unknown/Not detectable")
                    else:
                        self.signal_strength = rssi
                        logger.info(f"📶 Signal strength: {rssi}/31")
                    return self.signal_strength
                except ValueError:
                    return 0
            return 0
        except Exception as e:
            logger.error(f"Error checking signal: {e}")
            return 0
    
    def get_status(self) -> dict:
        """Get SIMCOM module status"""
        return {
            "sim_inserted": self.sim_inserted,
            "signal_strength": self.signal_strength,
            "connected": self.serial is not None and not self.serial.closed if self.serial else False
        }
    
    def _check_and_ensure_network_registered(self) -> bool:
        """Check network registration and re-register if needed - with automatic recovery"""
        try:
            if not self.serial or self.serial.closed:
                return False
            
            # Check registration status
            response = self._send_at_command("AT+CREG?", timeout=3)
            
            is_registered = False
            if "+CREG:" in response:
                try:
                    parts = response.split("+CREG:")[1].strip().split(",")
                    if len(parts) >= 2:
                        stat = int(parts[1].strip())
                        # Status 1, 2, or 5 means registered
                        if stat in [1, 2, 5]:
                            is_registered = True
                            return True  # Already registered
                        else:
                            logger.warning(f"⚠️ Network not registered (status: {stat}), re-registering...")
                except:
                    pass
            
            # If not registered, force re-registration
            if not is_registered:
                logger.info("🔄 Network lost - re-registering automatically...")
                
                # Cancel any stuck operations first
                self._cancel_any_pending_sms()
                time.sleep(0.3)
                
                # Clear buffers
                self.serial.reset_input_buffer()
                time.sleep(0.2)
                
                # Enable network registration notifications
                self._send_at_command("AT+CREG=2", timeout=2)
                time.sleep(0.5)
                
                # Force automatic network selection
                self._send_at_command("AT+COPS=0", timeout=8)
                time.sleep(3)  # Wait for registration
                
                # Check again
                response = self._send_at_command("AT+CREG?", timeout=3)
                if "+CREG:" in response:
                    try:
                        parts = response.split("+CREG:")[1].strip().split(",")
                        if len(parts) >= 2:
                            stat = int(parts[1].strip())
                            if stat in [1, 2, 5]:
                                logger.info("✅ Network re-registered successfully")
                                return True
                            else:
                                logger.warning(f"⚠️ Still not registered (status: {stat}), but will try SMS anyway")
                    except:
                        pass
                
                # Return True anyway - sometimes SMS works even if status shows 0
                return True
            
            return True
        except Exception as e:
            logger.error(f"Error checking network registration: {e}")
            return True  # Don't block SMS attempt
    
    def send_sms(self, phone_numbers: list, message: str) -> bool:
        """Send SMS to phone numbers"""
        try:
            if self.demo_mode:
                logger.info(f"DEMO: Would send SMS to {phone_numbers}: {message}")
                return True
            
            if not self.serial or self.serial.closed:
                logger.error("❌ SIMCOM module not connected")
                return False
            
            if not self.sim_inserted:
                logger.error("❌ SIM card not inserted or not ready")
                return False
            
            # CRITICAL: Check and ensure network is registered BEFORE SMS
            # This is called every time because network can be lost after first SMS
            if not self._check_and_ensure_network_registered():
                logger.warning("⚠️ Network registration check failed, but will attempt SMS anyway")
            
            # Check signal strength
            try:
                csq_response = self._send_at_command("AT+CSQ", timeout=2)
                if "+CSQ:" in csq_response:
                    try:
                        parts = csq_response.split("+CSQ:")[1].strip().split(",")
                        if len(parts) >= 1:
                            rssi = int(parts[0].strip())
                            if rssi == 99:
                                logger.warning("⚠️ No signal - SMS may fail")
                            elif rssi < 10:
                                logger.warning(f"⚠️ Weak signal ({rssi}/31) - SMS may fail")
                    except:
                        pass
            except:
                pass
            
            # Add "PillPal: " prefix to message since sender name is controlled by carrier
            # This ensures "PillPal" appears in the message even if sender name shows "Iz Me"
            if not message.startswith("PillPal:"):
                message = f"PillPal: {message}"
            
            # Prevent too frequent SMS sends (wait at least 3 seconds between SMS)
            current_time = time.time()
            if current_time - self.last_sms_time < 3:
                wait_time = 3 - (current_time - self.last_sms_time)
                time.sleep(wait_time)
            
            # CRITICAL: Cancel any stuck operations FIRST (module might be busy from previous SMS)
            self._cancel_any_pending_sms()
            time.sleep(0.3)
            
            # Clear all buffers completely
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()
            time.sleep(0.3)
            if self.serial.in_waiting > 0:
                self.serial.read(self.serial.in_waiting)
            
            # Check if module is ready (with recovery)
            module_ready = False
            for attempt in range(3):
                at_response = self._send_at_command("AT", timeout=2)
                if "OK" in at_response:
                    module_ready = True
                    break
                else:
                    logger.warning(f"⚠️ Module not responding (attempt {attempt + 1}/3), recovering...")
                    # Cancel and clear again
                    self._cancel_any_pending_sms()
                    time.sleep(0.5)
                    self.serial.reset_input_buffer()
                    if self.serial.in_waiting > 0:
                        self.serial.read(self.serial.in_waiting)
            
            if not module_ready:
                logger.error("❌ Module not responding after recovery attempts, skipping SMS")
                return False
            
            # Set SMS text mode
            self._send_at_command("AT+CMGF=1", timeout=2)
            time.sleep(0.2)
            
            success_count = 0
            for phone in phone_numbers:
                # Simplified: single attempt per phone (no retries to avoid delays)
                # SMS runs in background thread so it won't block other operations
                try:
                    # Normalize phone number for SMS (SIMCOM modules need international format)
                    # Remove all spaces, dashes, and other characters
                    phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace(".", "")
                    
                    # Log original format for debugging
                    original_phone = phone
                    
                    # ALWAYS convert to international format (+63XXXXXXXXXX)
                    # Remove any existing country code or leading characters
                    phone_clean = phone
                    
                    # Remove + if present
                    if phone_clean.startswith("+"):
                        phone_clean = phone_clean[1:]
                    
                    # Remove country code 63 if present
                    if phone_clean.startswith("63"):
                        phone_clean = phone_clean[2:]
                    
                    # Remove leading 0 if present (Philippine format)
                    if phone_clean.startswith("0"):
                        phone_clean = phone_clean[1:]
                    
                    # Now we should have just the 10-digit number
                    # Validate it's 10 digits
                    if not phone_clean.isdigit() or len(phone_clean) != 10:
                        logger.error(f"❌ Invalid phone number format: {original_phone} (cleaned: {phone_clean})")
                        continue
                    
                    # Convert to +63 format
                    phone = "+63" + phone_clean
                    
                    # Verify final format
                    if not phone.startswith("+63") or len(phone) != 13:
                        logger.error(f"❌ Phone number conversion failed: {original_phone} → {phone}")
                        continue
                    
                    logger.info(f"📤 Sending SMS to {phone} (original: {original_phone})...")
                    
                    # Clear buffer before sending
                    self.serial.reset_input_buffer()
                    time.sleep(0.3)
                    if self.serial.in_waiting > 0:
                        self.serial.read(self.serial.in_waiting)
                    
                    # CRITICAL: Ensure module is ready before sending CMGS
                    # Send AT command to wake up module
                    at_check = self._send_at_command("AT", timeout=2)
                    if "OK" not in at_check:
                        logger.warning(f"⚠️ Module not ready for {phone}, skipping...")
                        self._cancel_any_pending_sms()
                        time.sleep(0.5)
                        continue
                    
                    # Clear buffer again
                    time.sleep(0.2)
                    if self.serial.in_waiting > 0:
                        self.serial.read(self.serial.in_waiting)
                    
                    # Send AT+CMGS command and wait for prompt (with retries)
                    prompt_received = False
                    prompt_response = ""
                    
                    for prompt_attempt in range(3):  # Try 3 times
                        logger.debug(f"   Attempting to get '>' prompt (attempt {prompt_attempt + 1}/3)...")
                        
                        # Clear buffer before each attempt
                        self.serial.reset_input_buffer()
                        time.sleep(0.2)
                        if self.serial.in_waiting > 0:
                            self.serial.read(self.serial.in_waiting)
                        
                        # Send CMGS command
                        prompt_response = self._send_at_command(f'AT+CMGS="{phone}"', timeout=10, wait_for_prompt=True)
                        
                        # Check for prompt
                        if '>' in prompt_response:
                            prompt_received = True
                            logger.debug(f"   ✅ Got '>' prompt on attempt {prompt_attempt + 1}")
                            break
                        else:
                            # Wait longer and check buffer
                            logger.debug(f"   ⚠️ No prompt yet, waiting longer...")
                            time.sleep(1.0)  # Wait 1 second
                            
                            # Read any additional data
                            if self.serial.in_waiting > 0:
                                additional = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                                prompt_response += additional
                                logger.debug(f"   Additional data: {additional[:100]}")
                                
                                if '>' in additional:
                                    prompt_received = True
                                    logger.debug(f"   ✅ Got '>' prompt in additional data")
                                    break
                            
                            # If still no prompt, cancel and retry
                            if prompt_attempt < 2:  # Not last attempt
                                logger.warning(f"   ⚠️ No prompt (attempt {prompt_attempt + 1}/3), canceling and retrying...")
                                self._cancel_any_pending_sms()
                                time.sleep(1.0)  # Wait before retry
                    
                    if not prompt_received:
                        logger.error(f"❌ No '>' prompt for {phone} after 3 attempts")
                        logger.error(f"   Response received: {prompt_response[:200]}")
                        self._cancel_any_pending_sms()
                        # Clear all buffers
                        self.serial.reset_input_buffer()
                        time.sleep(0.5)
                        if self.serial.in_waiting > 0:
                            self.serial.read(self.serial.in_waiting)
                        continue
                    
                    # Clear buffer before sending message
                    time.sleep(0.1)
                    if self.serial.in_waiting > 0:
                        self.serial.read(self.serial.in_waiting)
                    
                    # Send message
                    message_bytes = message.encode('utf-8')
                    self.serial.write(message_bytes)
                    time.sleep(0.15)
                    self.serial.write(b'\x1A')  # Ctrl+Z
                    time.sleep(0.3)
                    
                    # Wait for response (faster timeout)
                    response = ""
                    start_time = time.time()
                    while time.time() - start_time < 8:  # 8 second timeout
                        if self.serial.in_waiting > 0:
                            chunk = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                            response += chunk
                            
                            if '+CMGS:' in response:
                                logger.info(f"✅ SMS sent successfully to {phone}")
                                success_count += 1
                                self.last_sms_time = time.time()
                                break
                            elif 'OK' in response and len(response) > 5:
                                # Quick check for CMGS
                                time.sleep(0.3)
                                if self.serial.in_waiting > 0:
                                    more = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                                    response += more
                                    if '+CMGS:' in response:
                                        logger.info(f"✅ SMS sent successfully to {phone}")
                                        success_count += 1
                                        self.last_sms_time = time.time()
                                        break
                                # Consider OK as success
                                logger.info(f"✅ SMS sent to {phone}")
                                success_count += 1
                                self.last_sms_time = time.time()
                                break
                            elif 'ERROR' in response or 'CMS ERROR' in response:
                                logger.error(f"❌ SMS failed: {response[:150]}")
                                break
                        time.sleep(0.1)
                    
                    # CRITICAL: Clean up after SMS to prevent "module busy" on next SMS
                    time.sleep(0.3)
                    if self.serial.in_waiting > 0:
                        self.serial.read(self.serial.in_waiting)
                    
                    # Cancel any pending operations to ensure clean state
                    self._cancel_any_pending_sms()
                    
                    # Clear buffers
                    self.serial.reset_input_buffer()
                    time.sleep(0.2)
                    
                    # Short wait between phone numbers
                    time.sleep(1.5)
                    
                except Exception as e:
                    logger.error(f"❌ Error sending SMS to {phone}: {e}")
                    # CRITICAL: Cancel any pending operations and clean up
                    try:
                        self._cancel_any_pending_sms()
                        self.serial.reset_input_buffer()
                        if self.serial.in_waiting > 0:
                            self.serial.read(self.serial.in_waiting)
                        time.sleep(0.5)
                        # Re-check network registration after error
                        self._check_and_ensure_network_registered()
                    except:
                        pass
                    continue
            
            if success_count > 0:
                logger.info(f"✅ SMS sent to {success_count}/{len(phone_numbers)} recipient(s)")
                return True
            else:
                logger.error("❌ Failed to send SMS to any recipient")
                return False
                
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False


class LCDController:
    """Handles I2C LCD display (address 0x27)"""
    
    LCD_ADDRESS = 0x27
    LCD_COLS = 16
    LCD_ROWS = 2
    
    def __init__(self, demo_mode=False):
        self.demo_mode = demo_mode
        self.lcd = None
        self.current_schedules = []  # Store schedules from frontend
        self.last_update_time = None
        self.dispensed_schedules = set()  # Track dispensed schedules (date_time_frame)
        self.is_dispensing = False  # Flag to show "DISPENSING" message
        self.dispensing_until = None  # When to stop showing "DISPENSING"
        self.is_dispensed = False  # Flag to show "DISPENSED" message
        self.dispensed_until = None  # When to stop showing "DISPENSED"
        
        if not demo_mode and LCD_AVAILABLE:
            self._initialize_lcd()
    
    def _initialize_lcd(self):
        """Initialize I2C LCD display"""
        try:
            logger.info(f"🔧 Initializing I2C LCD at address 0x{self.LCD_ADDRESS:02X}...")
            # Initialize LCD with I2C address 0x27, 16 columns, 2 rows
            self.lcd = CharLCD(i2c_expander='PCF8574', address=self.LCD_ADDRESS, cols=self.LCD_COLS, rows=self.LCD_ROWS)
            self.lcd.clear()
            self.lcd.write_string("PillPal Ready")
            time.sleep(1)
            logger.info("✅ LCD initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize LCD: {e}")
            logger.error("LCD will run in demo mode")
            self.demo_mode = True
            self.lcd = None
    
    def update_schedules(self, schedules: list):
        """Update schedules from frontend (received via WebSocket)"""
        self.current_schedules = schedules
        self.last_update_time = time.time()
        logger.info(f"📅 LCD: Updated with {len(schedules)} schedule(s)")
        self._update_display()
    
    def mark_dispensed(self, date: str, time_str: str, time_frame: str):
        """Mark a schedule as dispensed and show DISPENSED, then find next closest time"""
        key = f"{date}_{time_str}_{time_frame}"
        self.dispensed_schedules.add(key)
        logger.info(f"✅ LCD: Marked as dispensed - {key}")
        
        # Stop showing DISPENSING, now show DISPENSED
        self.is_dispensing = False
        self.dispensing_until = None
        
        # Show "DISPENSED" for 3 seconds, then find next closest time
        self.is_dispensed = True
        self.dispensed_until = time.time() + 3.0
        self._update_display()
    
    def show_dispensing(self, duration: float = 5.0):
        """Show DISPENSING message (for force dispense or manual dispense)"""
        self.is_dispensing = True
        self.dispensing_until = time.time() + duration
        logger.info("📺 LCD: Showing DISPENSING message")
        self._update_display()
    
    def _get_time_of_day(self, hour: int, minute: int = 0) -> str:
        """Get time of day label (Morning/Afternoon/Evening) - matches frontend time frames"""
        # Morning: 04:00 - 10:00 (inclusive of 10:00)
        if hour >= 4 and (hour < 10 or (hour == 10 and minute == 0)):
            return "Morning"
        # Afternoon: 10:05 - 16:00 (inclusive of 16:00)
        elif (hour == 10 and minute >= 5) or (hour > 10 and hour < 16) or (hour == 16 and minute == 0):
            return "Afternoon"
        # Evening: 16:05 - 00:00 and 00:00 - 04:00
        else:
            return "Evening"
    
    def _calculate_nearest_dispense(self) -> Optional[Dict]:
        """Calculate the nearest dispense time from current schedules (excluding dispensed ones)"""
        if not self.current_schedules:
            return None
        
        now = datetime.now()
        nearest_time = None
        nearest_schedule = None
        min_delta = None
        
        for schedule in self.current_schedules:
            try:
                # Parse time from schedule (format: "HH:MM" or "HH:MM:SS")
                time_str = schedule.get('time', '')
                if not time_str:
                    continue
                
                # Parse time (handle both "HH:MM" and "HH:MM:SS")
                time_parts = time_str.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1])
                
                # Get date from schedule or use today
                date_str = schedule.get('date', now.strftime("%Y-%m-%d"))
                
                # Parse date
                try:
                    schedule_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except:
                    schedule_date = now.date()
                
                # Create datetime for the scheduled date and time
                schedule_time = datetime.combine(schedule_date, datetime.min.time().replace(hour=hour, minute=minute, second=0))
                
                # If time has passed today, check next occurrence (tomorrow or next week)
                if schedule_time < now:
                    # For same day schedules that passed, move to next day
                    schedule_time += timedelta(days=1)
                
                # Check if this schedule was already dispensed
                time_frame = schedule.get('time_frame', '')
                # Check both today's date and tomorrow's date (in case schedule moved to next day)
                today_key = f"{schedule_date.strftime('%Y-%m-%d')}_{time_str}_{time_frame}"
                tomorrow_date = schedule_time.date()
                tomorrow_key = f"{tomorrow_date.strftime('%Y-%m-%d')}_{time_str}_{time_frame}"
                
                if today_key in self.dispensed_schedules or tomorrow_key in self.dispensed_schedules:
                    continue  # Skip dispensed schedules
                
                # Calculate time difference (only future times)
                delta = schedule_time - now
                if delta.total_seconds() < 0:
                    continue  # Skip past times
                
                # Find nearest future time
                if min_delta is None or delta < min_delta:
                    min_delta = delta
                    nearest_time = schedule_time
                    nearest_schedule = schedule
            except Exception as e:
                logger.warning(f"⚠️ Error parsing schedule time: {e}")
                continue
        
        if nearest_time:
            # Use time_frame from schedule if available, otherwise calculate from time
            time_frame = nearest_schedule.get('time_frame', '')
            if time_frame:
                # Map time_frame to display label
                time_of_day_map = {
                    'morning': 'Morning',
                    'afternoon': 'Afternoon',
                    'evening': 'Evening'
                }
                time_of_day = time_of_day_map.get(time_frame.lower(), self._get_time_of_day(nearest_time.hour, nearest_time.minute))
            else:
                # Fallback to calculating from time
                time_of_day = self._get_time_of_day(nearest_time.hour, nearest_time.minute)
            
            return {
                'time': nearest_time,
                'date_str': nearest_time.strftime("%m/%d"),
                'time_str': nearest_time.strftime("%I:%M %p"),
                'time_of_day': time_of_day,
                'medication': nearest_schedule.get('medication', 'Medicine'),
                'delta': min_delta
            }
        return None
    
    def _update_display(self):
        """Update LCD display - always shows closest scheduled time or status"""
        # Check if DISPENSED timeout expired
        if self.is_dispensed and self.dispensed_until:
            if time.time() >= self.dispensed_until:
                # Timeout expired - stop showing DISPENSED and find next closest time
                self.is_dispensed = False
                self.dispensed_until = None
                logger.info("📺 LCD: DISPENSED timeout expired, finding next closest time")
        
        # Check if DISPENSING timeout expired
        if self.is_dispensing and self.dispensing_until:
            if time.time() >= self.dispensing_until:
                # Timeout expired - stop showing DISPENSING and show next nearest time
                self.is_dispensing = False
                self.dispensing_until = None
                logger.info("📺 LCD: DISPENSING timeout expired, showing next nearest time")
        
        if self.demo_mode:
            if self.is_dispensing:
                logger.info("📺 LCD (DEMO): DISPENSING")
            elif self.is_dispensed:
                logger.info("📺 LCD (DEMO): DISPENSED")
            else:
                nearest = self._calculate_nearest_dispense()
                if nearest:
                    logger.info(f"📺 LCD (DEMO): {nearest['date_str']} {nearest['time_str']} ({nearest['time_of_day']})")
                else:
                    logger.info("📺 LCD (DEMO): PillPal READY")
            return
        
        if not self.lcd:
            return
        
        try:
            self.lcd.clear()
            
            # Priority 1: Show "DISPENSING" if currently dispensing
            if self.is_dispensing:
                self.lcd.cursor_pos = (0, 0)
                self.lcd.write_string("DISPENSING")
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string("")
                logger.info("📺 LCD: DISPENSING")
                return
            
            # Priority 2: Show "DISPENSED" if just dispensed (after servo2 moved)
            if self.is_dispensed:
                self.lcd.cursor_pos = (0, 0)
                self.lcd.write_string("DISPENSED")
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string("")
                logger.info("📺 LCD: DISPENSED")
                return
            
            # Priority 3: Always find and show the closest scheduled time
            nearest = self._calculate_nearest_dispense()
            
            if nearest:
                # Line 1: "11/20 08:00 AM" (date and time)
                line1 = f"{nearest['date_str']} {nearest['time_str']}"
                # Line 2: "Morning" (time frame)
                line2 = nearest['time_of_day']
                
                self.lcd.cursor_pos = (0, 0)
                self.lcd.write_string(line1[:self.LCD_COLS])
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string(line2[:self.LCD_COLS])
                
                logger.info(f"📺 LCD: {line1} - {line2}")
            else:
                # No schedule - show "PillPal READY"
                self.lcd.cursor_pos = (0, 0)
                self.lcd.write_string("PillPal READY")
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string("")
                logger.info("📺 LCD: PillPal READY")
        except Exception as e:
            logger.error(f"❌ Error updating LCD: {e}")
    
    def update_periodic(self):
        """Update display periodically (call this every minute or so)"""
        self._update_display()


class BuzzerController:
    """Handles buzzer on GPIO17 for dispense notifications"""
    
    BUZZER_PIN = 17  # GPIO17
    
    def __init__(self, demo_mode=False):
        self.demo_mode = demo_mode
        self.setup_complete = False
        
        if not demo_mode and GPIO_AVAILABLE:
            self._setup_buzzer()
    
    def _setup_buzzer(self):
        """Setup buzzer GPIO pin"""
        try:
            # GPIO mode should already be set globally, but ensure it's set
            if GPIO_AVAILABLE:
                try:
                    GPIO.setmode(GPIO.BCM)
                except:
                    pass  # Already set, ignore warning
            
            GPIO.setup(self.BUZZER_PIN, GPIO.OUT)
            GPIO.output(self.BUZZER_PIN, GPIO.LOW)  # Start with buzzer off
            self.setup_complete = True
            logger.info(f"🔔 Buzzer initialized on GPIO{self.BUZZER_PIN}")
        except Exception as e:
            logger.error(f"❌ Error setting up buzzer: {e}")
            import traceback
            traceback.print_exc()
            self.setup_complete = False
    
    def play_dispense_notification(self):
        """Alias for sound_dispense_notification for compatibility"""
        self.sound_dispense_notification()
    
    def sound_dispense_notification(self):
        """
        Sound buzzer for dispense notification
        Pattern: 1 second ON, 1 second OFF, repeat 3 times (total 6 seconds)
        Runs asynchronously so it doesn't block other operations
        """
        if self.demo_mode:
            logger.info("🔔 Buzzer (DEMO): Sounding dispense notification (1s ON, 1s OFF x3)")
            return
        
        if not self.setup_complete:
            logger.warning("⚠️ Buzzer not set up, skipping notification")
            return
        
        # Run in background thread so it doesn't block
        def _sound_pattern():
            try:
                logger.info("🔔 Buzzer: Starting dispense notification (1s ON, 1s OFF x3)")
                for i in range(3):
                    # Turn buzzer ON
                    GPIO.output(self.BUZZER_PIN, GPIO.HIGH)
                    logger.info(f"🔔 Buzzer: ON (beep {i+1}/3)")
                    time.sleep(1.0)  # 1 second ON
                    
                    # Turn buzzer OFF
                    GPIO.output(self.BUZZER_PIN, GPIO.LOW)
                    logger.info(f"🔔 Buzzer: OFF (pause {i+1}/3)")
                    if i < 2:  # Don't wait after last beep
                        time.sleep(1.0)  # 1 second OFF
                
                logger.info("🔔 Buzzer: Notification complete")
            except Exception as e:
                logger.error(f"❌ Error in buzzer pattern: {e}")
        
        # Run in background thread
        import threading
        thread = threading.Thread(target=_sound_pattern, daemon=True)
        thread.start()


class LEDController:
    """Handles LED indicators for servo position levels"""
    
    LED_GREEN_PIN = 22  # GPIO22 - GREEN LED - ON for positions 0°, 30°, 60°, 90°, 120° (lots of medicine remaining)
    LED_RED_PIN = 27    # GPIO27 - RED LED - ON for positions 150°, 180° (low medicine)
    
    def __init__(self, demo_mode=False):
        self.demo_mode = demo_mode
        self.setup_complete = False
        
        if not demo_mode and GPIO_AVAILABLE:
            self._initialize_leds()
    
    def _initialize_leds(self):
        """Initialize GPIO pins for LEDs"""
        try:
            # GPIO mode should already be set globally, but ensure it's set
            if GPIO_AVAILABLE:
                try:
                    GPIO.setmode(GPIO.BCM)
                except:
                    pass  # Already set, ignore warning
            
            GPIO.setup(self.LED_GREEN_PIN, GPIO.OUT)
            GPIO.setup(self.LED_RED_PIN, GPIO.OUT)
            # Start with both LEDs off
            GPIO.output(self.LED_GREEN_PIN, GPIO.LOW)
            GPIO.output(self.LED_RED_PIN, GPIO.LOW)
            self.setup_complete = True
            logger.info(f"✅ LEDs initialized: GPIO22 (GREEN - lots of medicine), GPIO27 (RED - low medicine)")
        except Exception as e:
            logger.error(f"❌ Error setting up LEDs: {e}")
            import traceback
            traceback.print_exc()
            self.setup_complete = False
    
    def update_leds(self, servo1_angle: float, force_update: bool = False):
        """Update LEDs based on servo1 position
        
        Green LED (GPIO22): ON for 0°, 30°, 60°, 90°, 120° - STAYS ON as long as angle doesn't change
        Red LED (GPIO27): ON for 150°, 180° - STAYS ON as long as angle doesn't change
        Only ONE LED should be on at a time - the other is ALWAYS OFF.
        
        Args:
            servo1_angle: Current servo1 angle in degrees
            force_update: If True, force update even if angle hasn't changed (for startup initialization)
        """
        if self.demo_mode:
            angle_int = int(round(servo1_angle))
            if angle_int in [0, 30, 60, 90, 120]:
                logger.info(f"💡 LED (DEMO): GREEN (GPIO22) ON, RED (GPIO27) OFF - Position: {angle_int}°")
            elif angle_int in [150, 180]:
                logger.info(f"💡 LED (DEMO): RED (GPIO27) ON, GREEN (GPIO22) OFF - Position: {angle_int}°")
            else:
                logger.info(f"💡 LED (DEMO): Both OFF - Position: {angle_int}°")
            return
        
        if not self.setup_complete:
            logger.warning("⚠️ LEDs not set up - cannot update")
            return
        
        try:
            # Round to nearest integer for angle comparison
            angle_int = int(round(servo1_angle))
            
            # Initialize tracking on first call
            if not hasattr(self, '_last_angle'):
                self._last_angle = None  # Track last angle to detect changes
                self._last_led_state = None  # Track last LED state ('green', 'red', 'off')
            
            # Determine what the LED state should be for this angle
            desired_state = None
            if angle_int in [0, 30, 60, 90, 120]:
                desired_state = 'green'
            elif angle_int in [150, 180]:
                desired_state = 'red'
            else:
                desired_state = 'off'
            
            # CRITICAL: Only update GPIO if angle OR state changed (prevents unnecessary writes and blinking)
            # OR if force_update is True (for startup initialization)
            # This ensures LEDs stay ON as long as angle doesn't change
            if not force_update and angle_int == self._last_angle and desired_state == self._last_led_state:
                # Angle and state haven't changed - LEDs should already be in correct state
                # Don't write to GPIO, just return (prevents blinking and keeps LEDs ON)
                return
            
            # Angle or state changed (or force_update) - update LEDs
            # Store new state BEFORE updating GPIO
            self._last_angle = angle_int
            self._last_led_state = desired_state
            
            # Green LED (GPIO22): ON for 0°, 30°, 60°, 90°, 120°
            if desired_state == 'green':
                # Turn OFF red first, then turn ON green (ensures only green is on)
                GPIO.output(self.LED_RED_PIN, GPIO.LOW)      # Red OFF (explicit)
                GPIO.output(self.LED_GREEN_PIN, GPIO.HIGH)  # Green ON (stays on until angle changes)
                logger.info(f"💚 GREEN LED (GPIO22) ON, RED LED (GPIO27) OFF - Position: {angle_int}°")
            
            # Red LED (GPIO27): ON for 150°, 180°
            elif desired_state == 'red':
                # Turn OFF green first, then turn ON red (ensures only red is on)
                GPIO.output(self.LED_GREEN_PIN, GPIO.LOW)   # Green OFF (explicit)
                GPIO.output(self.LED_RED_PIN, GPIO.HIGH)    # Red ON (stays on until angle changes)
                logger.info(f"❤️ RED LED (GPIO27) ON, GREEN LED (GPIO22) OFF - Position: {angle_int}°")
            
            # Any other angle: Both OFF
            else:
                GPIO.output(self.LED_GREEN_PIN, GPIO.LOW)   # Green OFF
                GPIO.output(self.LED_RED_PIN, GPIO.LOW)      # Red OFF
                logger.info(f"⚪ Both LEDs OFF - Position: {angle_int}° (not a standard position)")
            
        except Exception as e:
            logger.error(f"❌ Error updating LEDs: {e}")
            import traceback
            traceback.print_exc()


# Initialize GPIO mode ONCE before any GPIO operations
if GPIO_AVAILABLE:
    try:
        GPIO.setmode(GPIO.BCM)
        logger.info("✅ GPIO mode set to BCM (initialized once)")
    except Exception as e:
        logger.error(f"❌ Error setting GPIO mode: {e}")

# Global controllers (initialized once, not reset on connection)
servo_controller = ServoController(demo_mode=False)  # Set to True for testing
sms_controller = SMSController(demo_mode=False, serial_port='/dev/ttyS0', baudrate=115200)  # Set demo_mode=True for testing without SIMCOM
lcd_controller = LCDController(demo_mode=False)  # LCD display controller
led_controller = LEDController(demo_mode=False)  # LED level indicators
buzzer_controller = BuzzerController(demo_mode=False)  # Buzzer for dispense notifications

# Global WebSocket connections for button press notifications
active_websockets = set()


class ButtonMonitor:
    """Monitors GPIO26 button for press events"""
    
    BUTTON_PIN = 26  # GPIO26
    DEBOUNCE_TIME = 0.05  # 50ms debounce
    
    def __init__(self):
        self.last_press_time = 0
        self.setup_complete = False
        
        if GPIO_AVAILABLE:
            try:
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(self.BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
                self.setup_complete = True
                logger.info(f"✅ GPIO26 button initialized (pin {self.BUTTON_PIN})")
            except Exception as e:
                logger.error(f"❌ Error setting up GPIO26: {e}")
                self.setup_complete = False
        else:
            logger.warning("⚠️ GPIO not available - button monitoring disabled")
    
    async def monitor_button(self):
        """Monitor button in background and send events to connected clients"""
        global active_websockets  # Declare global variable
        
        if not self.setup_complete:
            logger.warning("⚠️ Button monitoring not started - GPIO not available")
            return
        
        logger.info("🔘 Starting GPIO26 button monitoring...")
        last_state = GPIO.HIGH
        
        while True:
            try:
                current_state = GPIO.input(self.BUTTON_PIN)
                
                # Button pressed (LOW when pressed with PUD_UP)
                if current_state == GPIO.LOW and last_state == GPIO.HIGH:
                    current_time = time.time()
                    # Debounce check
                    if current_time - self.last_press_time > self.DEBOUNCE_TIME:
                        self.last_press_time = current_time
                        logger.info("🔘 GPIO26 button PRESSED!")
                        
                        # Send button press event to all connected clients
                        button_message = json.dumps({
                            "type": "button_press",
                            "pressed": True,
                            "timestamp": current_time
                        })
                        
                        # Send to all active WebSocket connections
                        disconnected = set()
                        # Make a copy of active_websockets to avoid modification during iteration
                        websockets_to_notify = list(active_websockets)
                        logger.info(f"📤 Sending button press to {len(websockets_to_notify)} client(s)")
                        
                        for ws in websockets_to_notify:
                            try:
                                await ws.send(button_message)
                                logger.info("📤 Button press sent to client")
                            except Exception as e:
                                logger.error(f"❌ Error sending button press: {e}")
                                disconnected.add(ws)
                        
                        # Remove disconnected clients
                        active_websockets -= disconnected
                        if disconnected:
                            logger.info(f"🧹 Removed {len(disconnected)} disconnected client(s)")
                
                last_state = current_state
                await asyncio.sleep(0.01)  # Check every 10ms
                
            except Exception as e:
                logger.error(f"❌ Error in button monitoring: {e}")
                await asyncio.sleep(0.1)


# Global button monitor
button_monitor = ButtonMonitor()


async def handle_dispense(servo_id: str, medication: str, target_angle: float = None) -> dict:
    """
    Handle dispense command
    Moves servo1 to target_angle if provided (progressive dispense), otherwise 30 degrees from current position
    After main servo completes, shows confirmation dialog for servo2 medicine dispense
    Servo2 stays at 0° until user confirms
    """
    try:
        logger.info(f"Dispensing {medication} via {servo_id}")
        if target_angle is not None:
            logger.info(f"🎯 Progressive dispense: target_angle={target_angle}°")
        
        # Move main servo (servo1) to target_angle or 30 degrees from current position
        success = servo_controller.dispense(servo_id, target_angle=target_angle)
        
        if success:
            # Update LEDs after dispense (led_controller is global)
            current_servo1_angle = servo_controller.get_position('servo1')
            if current_servo1_angle is not None:
                led_controller.update_leds(current_servo1_angle)
            
            # Sound buzzer notification (non-blocking, runs in background thread)
            buzzer_controller.sound_dispense_notification()
            
            # Check if servo1 is at 180° (needs confirmation before resetting)
            is_at_180 = current_servo1_angle and int(current_servo1_angle) >= 180
            
            if is_at_180:
                logger.info("🔄 Servo1 is at 180° - waiting for confirmation before resetting")
                logger.info("💊 User must confirm to reset servo1 to 0° and move servo2 to 100°")
            else:
                logger.info("🎯 Main dispense complete, showing medicine dispense confirmation dialog")
                logger.info("💊 Servo2 will stay at 3° until user confirms")
            
            return {
                "status": "success",
                "servo_id": servo_id,
                "medication": medication,
                "message": f"{medication} dispensed successfully",
                "servo2_ready": True,
                "requires_confirmation": True,  # Frontend will show confirmation dialog
                "servo1_at_180": is_at_180,  # Flag to indicate servo1 needs reset
                "servo1_angle": float(current_servo1_angle) if current_servo1_angle is not None else 0.0  # Current servo1 angle for tracking
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
    Handle servo2 medicine dispense confirmation
    Moves servo2 from 3° to 100° (counter-clockwise) FAST, stays for 2 seconds, then returns to 3°
    If servo1 is at 180°, also resets servo1 to 0° after confirmation
    Only called when user confirms "Yes" to dispense medicine OR automatically for force dispense
    """
    try:
        logger.info("✅ Medicine dispense confirmed (user or auto)")
        
        # Show DISPENSING on LCD immediately
        lcd_controller.show_dispensing(duration=7.0)  # Show for 7 seconds (covers servo2 movement)
        
        # Check if servo1 is at 180° and needs to be reset
        current_servo1_angle = servo_controller.get_position('servo1')
        is_at_180 = current_servo1_angle and int(current_servo1_angle) >= 180
        
        if is_at_180:
            logger.info("🔄 Servo1 is at 180° - will reset to 0° after servo2 completes")
        
        # Wait 1 second after servo1 movement before moving servo2
        logger.info("⏱️  Waiting 1 second after servo1 movement before moving servo2...")
        await asyncio.sleep(1.0)
        
        # Move servo2 from 3° to 100° (COUNTER-CLOCKWISE, FAST)
        logger.info("🎯 Moving servo2 from 3° to 100° (COUNTER-CLOCKWISE, FAST - quick dispense)")
        servo2_success = servo_controller.move_servo2_to_100()
        
        if servo2_success:
            # Wait 4 seconds at 100° (increased from 2 seconds to prevent overheating)
            logger.info("⏱️  Servo2 at 100°, waiting 2 seconds before returning to 3° (fast dispense)")
            await asyncio.sleep(2.0)
            
            # Return servo2 to 3° (slowly)
            reset_success = servo_controller.reset_servo2()
            
            # If servo1 is at 180°, reset it to 0° now
            if is_at_180:
                logger.info("🔄 Resetting servo1 from 180° to 0° (after confirmation)")
                channel = servo_controller.servos.get('servo1', 4)
                if servo_controller.kit:
                    servo_controller.kit.servo[channel].angle = 0
                    servo_controller.servo_positions['servo1'] = 0.0
                    time.sleep(0.6)
                    servo_controller._save_positions()
                    logger.info("✅ Servo1 reset to 0°")
            
            if reset_success:
                return {
                    "status": "success",
                    "message": "Medicine dispensed successfully",
                    "servo1_reset": is_at_180
                }
            else:
                return {
                    "status": "partial_success",
                    "message": "Medicine dispensed but servo2 did not return to 3°",
                    "servo1_reset": is_at_180
                }
        else:
            return {
                "status": "error",
                "message": "Failed to dispense medicine"
            }
    except Exception as e:
        logger.error(f"Error in handle_servo2_dispense: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


async def handle_sms(phone_numbers: list, message: str) -> dict:
    """Handle SMS sending command - runs in background thread to not block other operations"""
    try:
        logger.info(f"📱 Queueing SMS to {phone_numbers} (non-blocking)")
        
        # Run SMS sending in background thread so it doesn't block servo operations
        import threading
        def send_sms_background():
            try:
                success = sms_controller.send_sms(phone_numbers, message)
                if success:
                    logger.info(f"✅ SMS sent successfully to {phone_numbers}")
                else:
                    logger.warning(f"⚠️ SMS failed to send to {phone_numbers}")
            except Exception as e:
                logger.error(f"❌ Error in background SMS sending: {e}")
        
        # Start SMS in background thread (non-blocking)
        sms_thread = threading.Thread(target=send_sms_background, daemon=True)
        sms_thread.start()
        
        # Return immediately with success=True so frontend knows SMS was queued
        # Frontend checks for smsResult.success, so we need to include it
        return {
            "status": "queued",
            "success": True,  # Frontend checks for this
            "message": "SMS queued for sending (non-blocking)"
        }
    except Exception as e:
        logger.error(f"Error in handle_sms: {e}")
        return {
            "status": "error",
            "success": False,  # Frontend checks for this
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
    
    # Add to active connections for button press notifications
    active_websockets.add(websocket)
    
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
                    target_angle = data.get('target_angle')  # Progressive dispense: target angle from frontend
                    date = data.get('date')  # Date of schedule (YYYY-MM-DD)
                    time_str = data.get('time')  # Time of schedule (HH:MM)
                    time_frame = data.get('time_frame')  # Time frame (morning/afternoon/evening)
                    
                    logger.info(f"🎯 Dispense command received: servo_id='{servo_id}', medication='{medication}'")
                    if target_angle is not None:
                        logger.info(f"🎯 Progressive dispense: target_angle={target_angle}°")
                    logger.info(f"🔧 Available servos: {list(servo_controller.servos.keys())}")
                    logger.info(f"🔧 Demo mode: {servo_controller.demo_mode}")
                    logger.info(f"🔧 PCA9685 kit: {servo_controller.kit is not None}")
                    
                    result = await handle_dispense(servo_id, medication, target_angle)
                    
                    # Don't mark as dispensed here - only mark when servo2 actually moves (user confirms)
                    # This allows the schedule to show again if user clicks "No"
                    
                    logger.info(f"📤 Sending result: {result}")
                    await websocket.send(json.dumps(result))
                    
                elif message_type == 'servo2_dispense':
                    # Handle second servo dispense confirmation
                    logger.info("🎯 Servo2 dispense confirmation received")
                    
                    # Get date/time/time_frame from data if provided (for LCD tracking)
                    date = data.get('date')
                    time_str = data.get('time')
                    time_frame = data.get('time_frame')
                    
                    result = await handle_servo2_dispense()
                    
                    # Mark schedule as dispensed on LCD only when servo2 actually moves (user confirmed)
                    if result.get('status') == 'success' and date and time_str and time_frame:
                        lcd_controller.mark_dispensed(date, time_str, time_frame)
                    elif result.get('status') == 'success':
                        # Force dispense or manual dispense without schedule info - still show DISPENSING
                        # (already shown in handle_servo2_dispense, but ensure it updates after)
                        pass
                    
                    # Update LCD after dispense to show next nearest time
                    # This happens automatically when DISPENSING timeout expires
                    
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
                
                elif message_type == 'check_simcom_status':
                    # Handle SIMCOM status check
                    status = sms_controller.get_status()
                    await websocket.send(json.dumps({
                        "status": "success",
                        "type": "simcom_status",
                        "sim_inserted": status.get("sim_inserted", False),
                        "signal_strength": status.get("signal_strength", 0),
                        "connected": status.get("connected", False)
                    }))
                    
                elif message_type == 'update_schedules':
                    # Handle schedule update for LCD display
                    schedules = data.get('schedules', [])
                    logger.info(f"📅 Received schedule update: {len(schedules)} schedule(s)")
                    lcd_controller.update_schedules(schedules)
                    await websocket.send(json.dumps({
                        "status": "success",
                        "message": f"Schedules updated: {len(schedules)} schedule(s)"
                    }))
                    
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
        # Remove from active connections
        active_websockets.discard(websocket)
        logger.info(f"Connection closed for {client_address}")
        # CRITICAL: Don't reset servos here either!


async def lcd_update_task():
    """Periodically update LCD display (every 10 seconds to always show closest time)"""
    while True:
        try:
            await asyncio.sleep(10)  # Update every 10 seconds to always show closest time
            lcd_controller.update_periodic()
        except Exception as e:
            logger.error(f"❌ Error in LCD update task: {e}")
            await asyncio.sleep(10)


async def led_update_task():
    """Periodically update LEDs based on servo1 angle (every 1 second)"""
    logger.info("💡 LED update task started - checking servo1 angle every 1 second")
    while True:
        try:
            await asyncio.sleep(1.0)  # Check every 1 second
            # Get current servo1 angle
            current_angle = servo_controller.get_position('servo1')
            if current_angle is not None:
                # Update LEDs based on current angle
                # The update_leds function will only write to GPIO if angle/state changed
                led_controller.update_leds(current_angle)
            else:
                logger.warning("⚠️ LED task: Could not get servo1 angle")
        except Exception as e:
            logger.error(f"❌ Error in LED update task: {e}")
            import traceback
            traceback.print_exc()
            await asyncio.sleep(1.0)


async def main():
    """Main function - initializes all controllers and starts server"""
    logger.info("=" * 50)
    logger.info("🚀 Starting PillPal Raspberry Pi Server")
    logger.info("=" * 50)
    
    # Log initialization status
    logger.info(f"📊 Initialization Status:")
    logger.info(f"   - GPIO Available: {GPIO_AVAILABLE}")
    logger.info(f"   - PCA9685 Available: {PCA9685_AVAILABLE}")
    logger.info(f"   - LCD Available: {LCD_AVAILABLE}")
    logger.info(f"   - Serial Available: {SERIAL_AVAILABLE}")
    logger.info(f"   - Servo Controller: {'Demo' if servo_controller.demo_mode else 'Active'}")
    logger.info(f"   - SMS Controller: {'Demo' if sms_controller.demo_mode else 'Active'}")
    logger.info(f"   - LCD Controller: {'Demo' if lcd_controller.demo_mode else 'Active'}")
    logger.info(f"   - LED Controller: {'Demo' if led_controller.demo_mode else 'Active'}, Setup: {led_controller.setup_complete}")
    logger.info(f"   - Buzzer Controller: {'Demo' if buzzer_controller.demo_mode else 'Active'}, Setup: {buzzer_controller.setup_complete}")
    logger.info("=" * 50)
    """Start the WebSocket server"""
    host = "0.0.0.0"  # Listen on all interfaces
    port = 8765
    
    logger.info("=" * 50)
    logger.info("PillPal WebSocket Server Starting...")
    logger.info(f"Listening on {host}:{port}")
    logger.info("Servo positions will be maintained (not reset)")
    logger.info("=" * 50)
    
    # Initialize LEDs based on current servo1 position at startup
    # This ensures LEDs are set correctly when server starts
    try:
        current_angle = servo_controller.get_position('servo1')
        if current_angle is not None:
            logger.info(f"🔍 Reading servo1 angle at startup: {current_angle}°")
            # Force update LEDs at startup (bypass the angle check to ensure LEDs are set)
            led_controller.update_leds(current_angle, force_update=True)
            logger.info(f"💡 LEDs initialized and set for servo1 position: {current_angle}°")
        else:
            logger.info("🔍 Servo1 angle not available at startup, setting LEDs for 0°")
            led_controller.update_leds(0.0, force_update=True)
            logger.info("💡 LEDs initialized and set for servo1 position: 0°")
    except Exception as e:
        logger.warning(f"⚠️ Could not initialize LEDs: {e}")
        import traceback
        traceback.print_exc()
    
    # Start button monitoring in background
    button_task = asyncio.create_task(button_monitor.monitor_button())
    
    # Start LCD periodic update task
    lcd_task = asyncio.create_task(lcd_update_task())
    
    # Start LED periodic update task (checks servo1 angle every 1 second)
    # This task will maintain LEDs - it only updates GPIO if angle changes
    # LEDs will stay ON as long as angle doesn't change
    led_task = asyncio.create_task(led_update_task())
    logger.info("💡 LED periodic task started - will maintain LEDs based on servo1 angle")
    
    # Start WebSocket server
    async with websockets.serve(handle_client, host, port):
        logger.info(f"WebSocket server running on ws://{host}:{port}")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")

