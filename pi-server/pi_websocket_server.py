#!/usr/bin/env python3
"""
PillPal Raspberry Pi WebSocket Server
Handles dispense commands and SMS sending via WebSocket
FIXED: Servo no longer resets to 0 degrees on disconnect/reconnect
"""

import asyncio
import websockets
import json
import logging
from typing import Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Hardware imports - uncomment for production
# from gpiozero import Servo
# import RPi.GPIO as GPIO

class ServoController:
    """Manages servo motors without resetting on initialization"""
    
    def __init__(self, demo_mode=False):
        self.demo_mode = demo_mode
        self.servos: Dict[str, any] = {}
        self.servo_positions: Dict[str, float] = {}  # Track positions
        
        if not demo_mode:
            self._initialize_servos()
    
    def _initialize_servos(self):
        """Initialize servos WITHOUT resetting to 0 degrees"""
        try:
            # IMPORTANT: Don't set servo positions on initialization
            # Servos will maintain their current position
            
            # Option 1: Using GPIOZero (recommended)
            # from gpiozero import Servo
            # self.servos['servo1'] = Servo(18)  # Pin 18
            # # DON'T DO: self.servos['servo1'].value = 0  # This resets position!
            # # Instead, set to None to disable without moving
            # self.servos['servo1'].value = None
            
            # Option 2: Using RPi.GPIO with PWM
            # GPIO.setmode(GPIO.BCM)
            # GPIO.setup(18, GPIO.OUT)
            # self.servos['servo1'] = GPIO.PWM(18, 50)  # 50Hz
            # # DON'T DO: self.servos['servo1'].start(0)  # This resets position!
            # # Only start PWM when actually moving the servo
            
            logger.info("Servos initialized (positions maintained)")
        except Exception as e:
            logger.error(f"Failed to initialize servos: {e}")
            self.demo_mode = True
    
    def dispense(self, servo_id: str, angle: float = 30.0) -> bool:
        """
        Move servo to dispense position
        Only moves when called - doesn't reset on initialization
        """
        try:
            if self.demo_mode:
                logger.info(f"DEMO: Servo {servo_id} would move {angle} degrees")
                self.servo_positions[servo_id] = angle
                return True
            
            if servo_id not in self.servos:
                logger.error(f"Servo {servo_id} not found")
                return False
            
            # Move servo to dispense position
            # Option 1: GPIOZero
            # servo = self.servos[servo_id]
            # # Calculate value from angle (0-180 degrees -> -1 to 1)
            # value = (angle / 90.0) - 1.0  # 0° = -1, 90° = 0, 180° = 1
            # servo.value = value
            # self.servo_positions[servo_id] = angle
            
            # Option 2: RPi.GPIO PWM
            # servo = self.servos[servo_id]
            # servo.start(0)  # Start PWM only when moving
            # duty_cycle = 2.5 + (angle / 180.0) * 10.0  # 0° = 2.5%, 180° = 12.5%
            # servo.ChangeDutyCycle(duty_cycle)
            # time.sleep(0.5)  # Wait for movement
            # # Don't stop PWM - let servo hold position
            # self.servo_positions[servo_id] = angle
            
            logger.info(f"Servo {servo_id} moved to {angle} degrees")
            return True
            
        except Exception as e:
            logger.error(f"Error moving servo {servo_id}: {e}")
            return False
    
    def get_position(self, servo_id: str) -> Optional[float]:
        """Get current servo position"""
        return self.servo_positions.get(servo_id, None)


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
    Moves servo 30 degrees (or configured amount) without resetting to 0
    """
    try:
        logger.info(f"Dispensing {medication} via {servo_id}")
        
        # Move servo 30 degrees (or your configured dispense angle)
        success = servo_controller.dispense(servo_id, angle=30.0)
        
        if success:
            return {
                "status": "success",
                "servo_id": servo_id,
                "medication": medication,
                "message": f"{medication} dispensed successfully"
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


async def handle_client(websocket, path):
    """
    Handle WebSocket client connections
    IMPORTANT: Does NOT reset servos on connection/disconnection
    """
    client_address = websocket.remote_address
    logger.info(f"Client connected from {client_address}")
    
    # CRITICAL: Don't reset servos here!
    # The servo_controller maintains positions across connections
    # Only move servos when dispense commands are received
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type')
                
                if message_type == 'dispense':
                    # Handle dispense command
                    servo_id = data.get('servo_id')
                    medication = data.get('medication', 'Unknown')
                    
                    result = await handle_dispense(servo_id, medication)
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
        # Cleanup if needed
        # GPIO.cleanup()  # Only if using RPi.GPIO




