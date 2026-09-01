/**
 * JARVIS Hardware Design Engine
 *
 * Generates wiring diagrams, bills of materials, architecture layouts,
 * and step-by-step assembly guides for hardware projects.
 *
 * Supports: Arduino, Raspberry Pi, ESP32, sensors, actuators, IoT,
 * robotics, home automation, wearables, drones, and custom PCBs.
 */

// ═══════════════════════════════════════════════════════════════
// COMPONENT DATABASE
// ═══════════════════════════════════════════════════════════════

export interface Component {
  id: string;
  name: string;
  category: 'microcontroller' | 'sensor' | 'actuator' | 'power' | 'communication' | 'display' | 'passive' | 'connector' | 'storage';
  voltage: string;
  pins: PinDefinition[];
  description: string;
  price: string;
  datasheet: string;
  compatibleWith: string[];
  tags: string[];
}

export interface PinDefinition {
  name: string;
  type: 'digital' | 'analog' | 'power' | 'ground' | 'i2c' | 'spi' | 'uart' | 'pwm' | 'touch';
  voltage?: string;
  description?: string;
}

export interface WiringConnection {
  from: { component: string; pin: string };
  to: { component: string; pin: string };
  wire: string;
  color?: string;
  notes?: string;
}

export interface WiringDiagram {
  title: string;
  description: string;
  components: Component[];
  connections: WiringConnection[];
  powerRequirements: PowerRequirement[];
  assemblySteps: string[];
  tips: string[];
}

export interface PowerRequirement {
  component: string;
  voltage: string;
  current: string;
  source: string;
}

export interface ProjectAnalysis {
  name: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedCost: string;
  estimatedTime: string;
  components: Component[];
  wiring: WiringDiagram;
  architecture: ArchitectureLayout;
  risks: string[];
  alternatives: string[];
}

export interface ArchitectureLayout {
  blocks: ArchitectureBlock[];
  connections: ArchitectureConnection[];
  dataFlow: string[];
  powerDistribution: string[];
}

export interface ArchitectureBlock {
  id: string;
  name: string;
  type: 'input' | 'processing' | 'output' | 'power' | 'communication' | 'storage';
  description: string;
  position?: { x: number; y: number };
}

export interface ArchitectureConnection {
  from: string;
  to: string;
  type: 'data' | 'power' | 'signal';
  protocol?: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT DATABASE — Common hardware components
// ═══════════════════════════════════════════════════════════════

export const COMPONENT_DB: Component[] = [
  // ── MICROCONTROLLERS ──
  {
    id: 'arduino-uno',
    name: 'Arduino Uno R3',
    category: 'microcontroller',
    voltage: '5V',
    pins: [
      { name: 'D0-D13', type: 'digital', voltage: '5V', description: '14 digital I/O pins' },
      { name: 'A0-A5', type: 'analog', voltage: '5V', description: '6 analog inputs' },
      { name: '5V', type: 'power', voltage: '5V' },
      { name: '3.3V', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'VIN', type: 'power', voltage: '7-12V' },
    ],
    description: 'ATmega328P-based microcontroller, 16MHz, 32KB flash, ideal for beginners',
    price: '$25',
    datasheet: 'https://docs.arduino.cc/hardware/uno-rev3',
    compatibleWith: ['sensor-dht22', 'sensor-hc-sr04', 'sensor-ldr', 'actuator-servo', 'actuator-led', 'actuator-relay', 'comm-bluetooth', 'comm-wifi-esp8266'],
    tags: ['beginner', '5v', 'analog', 'digital', 'i2c', 'spi', 'pwm'],
  },
  {
    id: 'esp32',
    name: 'ESP32 DevKit',
    category: 'microcontroller',
    voltage: '3.3V',
    pins: [
      { name: 'GPIO0-GPIO39', type: 'digital', voltage: '3.3V', description: '34 digital I/O pins' },
      { name: 'ADC1/ADC2', type: 'analog', voltage: '3.3V', description: '18 analog inputs' },
      { name: 'VIN', type: 'power', voltage: '5-12V' },
      { name: '3.3V', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'TX/RX', type: 'uart', description: 'UART communication' },
      { name: 'SDA/SCL', type: 'i2c', description: 'I2C communication' },
      { name: 'MOSI/MISO/SCK/SS', type: 'spi', description: 'SPI communication' },
    ],
    description: 'Dual-core 240MHz with WiFi + Bluetooth, 520KB SRAM, perfect for IoT',
    price: '$8',
    datasheet: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/',
    compatibleWith: ['sensor-dht22', 'sensor-hc-sr04', 'sensor-bme280', 'sensor-mpu6050', 'actuator-servo', 'actuator-neopixel', 'comm-lora', 'display-oled', 'display-tft'],
    tags: ['wifi', 'bluetooth', 'iot', '3.3v', 'dual-core', 'low-power'],
  },
  {
    id: 'raspberry-pi-pico',
    name: 'Raspberry Pi Pico W',
    category: 'microcontroller',
    voltage: '3.3V',
    pins: [
      { name: 'GP0-GP28', type: 'digital', voltage: '3.3V', description: '26 GPIO pins' },
      { name: 'ADC0-ADC3', type: 'analog', voltage: '3.3V', description: '4 analog inputs (12-bit)' },
      { name: 'VBUS', type: 'power', voltage: '5V USB' },
      { name: 'VSYS', type: 'power', voltage: '1.8-5.5V' },
      { name: '3V3', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
    ],
    description: 'RP2040 dual-core 133MHz with WiFi, 264KB SRAM, MicroPython support',
    price: '$6',
    datasheet: 'https://datasheets.raspberrypi.com/pico/Raspberry-Pi-Pico-W-product-brief.pdf',
    compatibleWith: ['sensor-dht22', 'sensor-bme280', 'actuator-servo', 'actuator-neopixel', 'display-oled'],
    tags: ['wifi', 'micropython', '3.3v', 'cheap', 'beginner'],
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    category: 'microcontroller',
    voltage: '5V',
    pins: [
      { name: 'D0-D13', type: 'digital', voltage: '5V', description: '14 digital I/O pins' },
      { name: 'A0-A7', type: 'analog', voltage: '5V', description: '8 analog inputs' },
      { name: '5V', type: 'power', voltage: '5V' },
      { name: '3.3V', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'VIN', type: 'power', voltage: '7-12V' },
    ],
    description: 'Compact ATmega328P, breadboard-friendly, great for embedded projects',
    price: '$12',
    datasheet: 'https://docs.arduino.cc/hardware/nano',
    compatibleWith: ['sensor-dht22', 'sensor-hc-sr04', 'sensor-ldr', 'actuator-servo', 'actuator-led', 'actuator-relay'],
    tags: ['compact', 'breadboard', '5v', 'beginner'],
  },
  // ── SENSORS ──
  {
    id: 'sensor-dht22',
    name: 'DHT22 Temperature & Humidity',
    category: 'sensor',
    voltage: '3.3-5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3-5V' },
      { name: 'DATA', type: 'digital', description: 'Single-wire data' },
      { name: 'NC', type: 'digital', description: 'Not connected' },
      { name: 'GND', type: 'ground' },
    ],
    description: '±0.5°C accuracy, 0-100% RH, digital output, 2s sampling',
    price: '$4',
    datasheet: 'https://cdn-shop.adafruit.com/datasheets/DHT22.pdf',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico', 'arduino-nano'],
    tags: ['temperature', 'humidity', 'weather', 'indoor', 'digital'],
  },
  {
    id: 'sensor-hc-sr04',
    name: 'HC-SR04 Ultrasonic Distance',
    category: 'sensor',
    voltage: '5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'TRIG', type: 'digital', description: 'Trigger pulse' },
      { name: 'ECHO', type: 'digital', description: 'Echo pulse' },
      { name: 'GND', type: 'ground' },
    ],
    description: '2cm-400cm range, 3mm resolution, 15° angle, 40kHz ultrasonic',
    price: '$2',
    datasheet: 'https://cdn-shop.adafruit.com/datasheets/HCSR04.pdf',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico'],
    tags: ['distance', 'ultrasonic', 'robot', 'navigation', 'obstacle'],
  },
  {
    id: 'sensor-bme280',
    name: 'BME280 Environmental Sensor',
    category: 'sensor',
    voltage: '1.71-3.6V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'SDA', type: 'i2c', description: 'I2C data' },
      { name: 'SCL', type: 'i2c', description: 'I2C clock' },
    ],
    description: 'Temperature, humidity, pressure, I2C/SPI, 300hPa-1100hPa',
    price: '$6',
    datasheet: 'https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/',
    compatibleWith: ['esp32', 'raspberry-pi-pico', 'arduino-uno'],
    tags: ['temperature', 'humidity', 'pressure', 'weather', 'i2c', 'precise'],
  },
  {
    id: 'sensor-mpu6050',
    name: 'MPU6050 6-Axis IMU',
    category: 'sensor',
    voltage: '2.375-3.46V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'SDA', type: 'i2c', description: 'I2C data' },
      { name: 'SCL', type: 'i2c', description: 'I2C clock' },
      { name: 'INT', type: 'digital', description: 'Interrupt output' },
    ],
    description: '3-axis gyroscope + 3-axis accelerometer, DMP, I2C, 16-bit ADC',
    price: '$3',
    datasheet: 'https://invensense.tdk.com/wp-content/uploads/2015/10/MPU-6000-Datasheet1.pdf',
    compatibleWith: ['esp32', 'arduino-uno', 'raspberry-pi-pico'],
    tags: ['gyro', 'accelerometer', 'imu', 'motion', 'drone', 'robot', 'i2c'],
  },
  {
    id: 'sensor-ldr',
    name: 'LDR Light Sensor',
    category: 'sensor',
    voltage: '3.3-5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3-5V' },
      { name: 'OUT', type: 'analog', description: 'Analog light level' },
      { name: 'GND', type: 'ground' },
    ],
    description: 'Photoresistor module, analog output, 10KΩ-200KΩ range',
    price: '$1',
    datasheet: '',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico', 'arduino-nano'],
    tags: ['light', 'brightness', 'analog', 'simple', 'cheap'],
  },
  {
    id: 'sensor-gas-mq2',
    name: 'MQ-2 Gas/Smoke Sensor',
    category: 'sensor',
    voltage: '5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'GND', type: 'ground' },
      { name: 'DOUT', type: 'digital', description: 'Digital threshold output' },
      { name: 'AOUT', type: 'analog', description: 'Analog gas level' },
    ],
    description: 'Detects LPG, CO, smoke, alcohol, methane, 200-10000ppm',
    price: '$3',
    datasheet: 'https://www.waveshare.com/datasheet/Sensor/MQ-2.pdf',
    compatibleWith: ['arduino-uno', 'esp32'],
    tags: ['gas', 'smoke', 'fire', 'safety', 'analog', 'digital'],
  },
  {
    id: 'sensor-pir',
    name: 'HC-SR501 PIR Motion Sensor',
    category: 'sensor',
    voltage: '5-20V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'OUT', type: 'digital', description: 'Motion detected HIGH' },
      { name: 'GND', type: 'ground' },
    ],
    description: '120° detection angle, 3-7m range, adjustable delay and sensitivity',
    price: '$2',
    datasheet: 'https://components101.com/sensors/pir-motion-sensor-module-hc-sr501-datasheet-pinout-features',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico'],
    tags: ['motion', 'pir', 'security', 'automation', 'digital'],
  },
  // ── ACTUATORS ──
  {
    id: 'actuator-servo',
    name: 'SG90 Micro Servo',
    category: 'actuator',
    voltage: '4.8-6V',
    pins: [
      { name: 'VCC (Red)', type: 'power', voltage: '5V' },
      { name: 'GND (Brown)', type: 'ground' },
      { name: 'Signal (Orange)', type: 'pwm', description: 'PWM control 50Hz' },
    ],
    description: '180° rotation, 1.8kg/cm torque, PWM controlled, 20ms period',
    price: '$2',
    datasheet: 'https://www.servodatabase.com/servo/towerpro/sg-90',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico', 'arduino-nano'],
    tags: ['servo', 'motor', 'rotation', 'robot', 'arm', 'pwm'],
  },
  {
    id: 'actuator-led',
    name: 'LED (Assorted Pack)',
    category: 'actuator',
    voltage: '2-3.3V',
    pins: [
      { name: 'Anode (+)', type: 'digital', description: 'Positive leg (longer)' },
      { name: 'Cathode (-)', type: 'ground', description: 'Negative leg (shorter)' },
    ],
    description: '5mm LEDs, 20mA max, requires 220-470Ω current limiting resistor',
    price: '$1',
    datasheet: '',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico', 'arduino-nano'],
    tags: ['led', 'light', 'indicator', 'output', 'simple', 'digital'],
  },
  {
    id: 'actuator-relay',
    name: '5V 1-Channel Relay Module',
    category: 'actuator',
    voltage: '5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'GND', type: 'ground' },
      { name: 'IN', type: 'digital', description: 'LOW to activate relay' },
      { name: 'COM', type: 'power', description: 'Common terminal' },
      { name: 'NO', type: 'power', description: 'Normally open' },
      { name: 'NC', type: 'power', description: 'Normally closed' },
    ],
    description: '10A/250VAC, 10A/30VDC, optocoupler isolation, LED indicator',
    price: '$2',
    datasheet: 'https://components101.com/relay-modules/relay-module-interfacing-arduino',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico', 'arduino-nano'],
    tags: ['relay', 'switch', 'high-voltage', 'automation', 'ac-control'],
  },
  {
    id: 'actuator-neopixel',
    name: 'WS2812B NeoPixel LED Strip',
    category: 'actuator',
    voltage: '5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'GND', type: 'ground' },
      { name: 'DIN', type: 'digital', description: 'Data input (WS2812B protocol)' },
    ],
    description: 'RGB LEDs, individually addressable, 800kHz data rate, daisy-chainable',
    price: '$8/m',
    datasheet: 'https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf',
    compatibleWith: ['esp32', 'arduino-uno', 'raspberry-pi-pico'],
    tags: ['led', 'rgb', 'strip', 'lighting', 'neopixel', 'ws2812'],
  },
  {
    id: 'actuator-stepper',
    name: '28BYJ-48 Stepper Motor + ULN2003',
    category: 'actuator',
    voltage: '5V',
    pins: [
      { name: 'IN1-IN4', type: 'digital', description: 'Coil control pins' },
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'GND', type: 'ground' },
    ],
    description: '5.625°/64 stride angle, 1:64 gear ratio, 2048 steps/rev, 500mA',
    price: '$4',
    datasheet: 'https://www.ti.com/lit/ds/symlink/uln2003a.pdf',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico'],
    tags: ['stepper', 'motor', 'precision', 'rotation', 'robot', 'cnc'],
  },
  {
    id: 'actuator-dc-motor',
    name: 'DC Motor + L298N Driver',
    category: 'actuator',
    voltage: '5-35V',
    pins: [
      { name: 'ENA', type: 'pwm', description: 'Speed control (PWM)' },
      { name: 'IN1/IN2', type: 'digital', description: 'Direction control' },
      { name: 'OUT1/OUT2', type: 'power', description: 'Motor output' },
      { name: 'VCC', type: 'power', voltage: '5V logic' },
      { name: 'VS', type: 'power', voltage: '5-35V motor' },
      { name: 'GND', type: 'ground' },
    ],
    description: 'Dual H-bridge, 2A per channel, PWM speed control, forward/reverse/brake',
    price: '$3',
    datasheet: 'https://www.st.com/resource/en/datasheet/l298.pdf',
    compatibleWith: ['arduino-uno', 'esp32', 'raspberry-pi-pico'],
    tags: ['motor', 'dc', 'driver', 'h-bridge', 'robot', 'vehicle', 'pwm'],
  },
  // ── DISPLAYS ──
  {
    id: 'display-oled',
    name: 'SSD1306 0.96" OLED Display',
    category: 'display',
    voltage: '3.3-5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3-5V' },
      { name: 'GND', type: 'ground' },
      { name: 'SDA', type: 'i2c', description: 'I2C data (or SPI SDA)' },
      { name: 'SCL', type: 'i2c', description: 'I2C clock (or SPI SCK)' },
    ],
    description: '128x64 pixels, I2C/SPI, SSD1306 driver, 0.96" diagonal, blue/white',
    price: '$4',
    datasheet: 'https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf',
    compatibleWith: ['esp32', 'arduino-uno', 'raspberry-pi-pico', 'arduino-nano'],
    tags: ['display', 'oled', 'i2c', 'small', 'text', 'graphics'],
  },
  {
    id: 'display-tft',
    name: 'ILI9341 2.8" TFT Touch Display',
    category: 'display',
    voltage: '3.3V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'CS', type: 'spi', description: 'Chip select' },
      { name: 'DC', type: 'digital', description: 'Data/Command' },
      { name: 'MOSI', type: 'spi', description: 'SPI data' },
      { name: 'SCK', type: 'spi', description: 'SPI clock' },
      { name: 'LED', type: 'power', voltage: '3.3V' },
      { name: 'MISO', type: 'spi', description: 'SPI data out' },
    ],
    description: '240x320 pixels, touch support, SPI interface, 2.8" diagonal',
    price: '$8',
    datasheet: 'https://www.buydisplay.com/download/ic/ILI9341_Datasheet.pdf',
    compatibleWith: ['esp32', 'arduino-uno', 'raspberry-pi-pico'],
    tags: ['display', 'tft', 'touch', 'spi', 'color', 'graphics'],
  },
  // ── COMMUNICATION ──
  {
    id: 'comm-bluetooth',
    name: 'HC-05 Bluetooth Module',
    category: 'communication',
    voltage: '3.3-5V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '5V' },
      { name: 'GND', type: 'ground' },
      { name: 'TXD', type: 'uart', description: 'UART transmit' },
      { name: 'RXD', type: 'uart', description: 'UART receive (3.3V!)' },
      { name: 'KEY', type: 'digital', description: 'AT command mode' },
    ],
    description: 'Bluetooth 2.0+EDR, 10m range, SPP serial port, AT commands',
    price: '$5',
    datasheet: 'https://components101.com/wireless/hc-05-bluetooth-module-datasheet',
    compatibleWith: ['arduino-uno', 'esp32', 'arduino-nano'],
    tags: ['bluetooth', 'serial', 'wireless', 'uart', 'phone'],
  },
  {
    id: 'comm-wifi-esp8266',
    name: 'ESP-01 WiFi Module',
    category: 'communication',
    voltage: '3.3V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'TX', type: 'uart', description: 'UART transmit' },
      { name: 'RX', type: 'uart', description: 'UART receive' },
      { name: 'CH_PD', type: 'power', voltage: '3.3V', description: 'Chip enable (pull HIGH)' },
      { name: 'RST', type: 'digital', description: 'Reset (pull HIGH)' },
      { name: 'GPIO0', type: 'digital', description: 'General purpose I/O' },
      { name: 'GPIO2', type: 'digital', description: 'General purpose I/O' },
    ],
    description: 'WiFi 802.11 b/g/n, AT commands, TCP/UDP, 80MHz, 1MB flash',
    price: '$3',
    datasheet: 'https://www.espressif.com/sites/default/files/documentation/0a-esp8266_at_instruction_set_en.pdf',
    compatibleWith: ['arduino-uno', 'arduino-nano'],
    tags: ['wifi', 'wireless', 'iot', 'uart', 'at-commands'],
  },
  {
    id: 'comm-lora',
    name: 'Ra-02 LoRa Module (SX1278)',
    category: 'communication',
    voltage: '3.3V',
    pins: [
      { name: 'VCC', type: 'power', voltage: '3.3V' },
      { name: 'GND', type: 'ground' },
      { name: 'MOSI', type: 'spi', description: 'SPI data in' },
      { name: 'MISO', type: 'spi', description: 'SPI data out' },
      { name: 'SCK', type: 'spi', description: 'SPI clock' },
      { name: 'NSS', type: 'spi', description: 'Chip select' },
      { name: 'RESET', type: 'digital', description: 'Reset' },
      { name: 'DIO0-DIO5', type: 'digital', description: 'IRQ pins' },
    ],
    description: 'LoRa 433MHz, 15km+ range, spread spectrum, low power, SPI interface',
    price: '$5',
    datasheet: 'https://www.semtech.com/uploads/documents/sx1278.pdf',
    compatibleWith: ['esp32', 'arduino-uno', 'raspberry-pi-pico'],
    tags: ['lora', 'long-range', 'wireless', 'iot', 'low-power', 'spi'],
  },
  // ── POWER ──
  {
    id: 'power-18650',
    name: '18650 Li-ion Battery + Holder',
    category: 'power',
    voltage: '3.7V',
    pins: [
      { name: 'Positive', type: 'power', voltage: '3.7V (4.2V charged)' },
      { name: 'Negative', type: 'ground' },
    ],
    description: '3.7V nominal, 2600-3500mAh, rechargeable, with battery holder',
    price: '$5',
    datasheet: '',
    compatibleWith: ['esp32', 'arduino-uno', 'raspberry-pi-pico'],
    tags: ['battery', 'portable', 'rechargeable', 'lithium'],
  },
  {
    id: 'power-boost',
    name: 'MT3608 DC-DC Boost Converter',
    category: 'power',
    voltage: '2-24V in → 5-28V out',
    pins: [
      { name: 'VIN+', type: 'power', description: 'Input positive' },
      { name: 'VIN-', type: 'ground', description: 'Input negative' },
      { name: 'VOUT+', type: 'power', description: 'Output positive' },
      { name: 'VOUT-', type: 'ground', description: 'Output negative' },
    ],
    description: 'Step-up converter, 2A max, adjustable output, 93% efficiency',
    price: '$1',
    datasheet: 'https://www.monolithicpower.com/en/mp2307.html',
    compatibleWith: ['esp32', 'arduino-uno', 'actuator-servo', 'actuator-neopixel'],
    tags: ['boost', 'converter', 'power', 'adjustable', 'portable'],
  },
  {
    id: 'power-ams1117',
    name: 'AMS1117-3.3V Voltage Regulator',
    category: 'power',
    voltage: '4.5-12V in → 3.3V out',
    pins: [
      { name: 'GND', type: 'ground' },
      { name: 'OUT', type: 'power', voltage: '3.3V' },
      { name: 'IN', type: 'power', voltage: '4.5-12V' },
    ],
    description: '3.3V LDO regulator, 800mA max, SOT-223 package, low dropout',
    price: '$0.50',
    datasheet: 'https://www.advanced-monolithic.com/pdf/ds1117.pdf',
    compatibleWith: ['esp32', 'raspberry-pi-pico', 'sensor-bme280', 'sensor-mpu6050'],
    tags: ['regulator', '3.3v', 'power', 'ldo', 'essential'],
  },
];

// ═══════════════════════════════════════════════════════════════
// PROJECT TEMPLATES — Pre-built project configurations
// ═══════════════════════════════════════════════════════════════

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  components: string[];
  connections: WiringConnection[];
  powerNeeds: string;
  tags: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'weather-station',
    name: 'IoT Weather Station',
    description: 'WiFi-connected weather station that logs temperature, humidity, and pressure to the cloud',
    category: 'iot',
    complexity: 'intermediate',
    components: ['esp32', 'sensor-bme280', 'display-oled', 'power-18650', 'power-boost'],
    connections: [
      { from: { component: 'BME280', pin: 'VCC' }, to: { component: 'ESP32', pin: '3.3V' }, wire: 'Red' },
      { from: { component: 'BME280', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'BME280', pin: 'SDA' }, to: { component: 'ESP32', pin: 'GPIO21' }, wire: 'Blue' },
      { from: { component: 'BME280', pin: 'SCL' }, to: { component: 'ESP32', pin: 'GPIO22' }, wire: 'Yellow' },
      { from: { component: 'OLED', pin: 'VCC' }, to: { component: 'ESP32', pin: '3.3V' }, wire: 'Red' },
      { from: { component: 'OLED', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'OLED', pin: 'SDA' }, to: { component: 'ESP32', pin: 'GPIO21' }, wire: 'Green' },
      { from: { component: 'OLED', pin: 'SCL' }, to: { component: 'ESP32', pin: 'GPIO22' }, wire: 'Orange' },
    ],
    powerNeeds: '3.3V, ~150mA active, ~10mA sleep',
    tags: ['weather', 'iot', 'cloud', 'sensor', 'display'],
  },
  {
    id: 'robot-car',
    name: 'Arduino Robot Car',
    description: 'Autonomous robot car with obstacle avoidance using ultrasonic sensor and servo',
    category: 'robotics',
    complexity: 'intermediate',
    components: ['arduino-uno', 'sensor-hc-sr04', 'actuator-servo', 'actuator-dc-motor', 'comm-bluetooth'],
    connections: [
      { from: { component: 'HC-SR04', pin: 'VCC' }, to: { component: 'Arduino', pin: '5V' }, wire: 'Red' },
      { from: { component: 'HC-SR04', pin: 'GND' }, to: { component: 'Arduino', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'HC-SR04', pin: 'TRIG' }, to: { component: 'Arduino', pin: 'D9' }, wire: 'White' },
      { from: { component: 'HC-SR04', pin: 'ECHO' }, to: { component: 'Arduino', pin: 'D10' }, wire: 'Grey' },
      { from: { component: 'Servo', pin: 'Signal' }, to: { component: 'Arduino', pin: 'D6' }, wire: 'Orange' },
      { from: { component: 'Servo', pin: 'VCC' }, to: { component: 'Arduino', pin: '5V' }, wire: 'Red' },
      { from: { component: 'Servo', pin: 'GND' }, to: { component: 'Arduino', pin: 'GND' }, wire: 'Brown' },
      { from: { component: 'L298N', pin: 'ENA' }, to: { component: 'Arduino', pin: 'D5' }, wire: 'Green' },
      { from: { component: 'L298N', pin: 'IN1' }, to: { component: 'Arduino', pin: 'D7' }, wire: 'Blue' },
      { from: { component: 'L298N', pin: 'IN2' }, to: { component: 'Arduino', pin: 'D8' }, wire: 'Purple' },
      { from: { component: 'HC-05', pin: 'TXD' }, to: { component: 'Arduino', pin: 'D2' }, wire: 'Yellow' },
      { from: { component: 'HC-05', pin: 'RXD' }, to: { component: 'Arduino', pin: 'D3' }, wire: 'Orange' },
    ],
    powerNeeds: '5V, 2A for motors, 500mA for logic',
    tags: ['robot', 'car', 'ultrasonic', 'bluetooth', 'servo', 'motor'],
  },
  {
    id: 'smart-home',
    name: 'Smart Home Hub',
    description: 'Control lights, fans, and appliances via WiFi with voice feedback and OLED display',
    category: 'home-automation',
    complexity: 'advanced',
    components: ['esp32', 'actuator-relay', 'sensor-pir', 'sensor-dht22', 'display-oled', 'actuator-neopixel'],
    connections: [
      { from: { component: 'Relay', pin: 'VCC' }, to: { component: 'ESP32', pin: '5V' }, wire: 'Red' },
      { from: { component: 'Relay', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'Relay', pin: 'IN' }, to: { component: 'ESP32', pin: 'GPIO25' }, wire: 'Blue' },
      { from: { component: 'PIR', pin: 'VCC' }, to: { component: 'ESP32', pin: '5V' }, wire: 'Red' },
      { from: { component: 'PIR', pin: 'OUT' }, to: { component: 'ESP32', pin: 'GPIO26' }, wire: 'Yellow' },
      { from: { component: 'PIR', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'DHT22', pin: 'VCC' }, to: { component: 'ESP32', pin: '3.3V' }, wire: 'Red' },
      { from: { component: 'DHT22', pin: 'DATA' }, to: { component: 'ESP32', pin: 'GPIO27' }, wire: 'Green' },
      { from: { component: 'DHT22', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'OLED', pin: 'SDA' }, to: { component: 'ESP32', pin: 'GPIO21' }, wire: 'Blue' },
      { from: { component: 'OLED', pin: 'SCL' }, to: { component: 'ESP32', pin: 'GPIO22' }, wire: 'Yellow' },
      { from: { component: 'NeoPixel', pin: 'VCC' }, to: { component: 'ESP32', pin: '5V' }, wire: 'Red' },
      { from: { component: 'NeoPixel', pin: 'DIN' }, to: { component: 'ESP32', pin: 'GPIO15' }, wire: 'Green' },
      { from: { component: 'NeoPixel', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
    ],
    powerNeeds: '5V 3A for NeoPixel + relay, 3.3V for sensors',
    tags: ['home', 'automation', 'relay', 'smart', 'wifi', 'display'],
  },
  {
    id: 'drone',
    name: 'Mini Quadcopter Drone',
    description: '4-motor drone with MPU6050 IMU, ESP32 flight controller, and barometric altitude hold',
    category: 'drones',
    complexity: 'expert',
    components: ['esp32', 'sensor-mpu6050', 'sensor-bme280', 'actuator-dc-motor', 'power-18650', 'power-boost'],
    connections: [
      { from: { component: 'MPU6050', pin: 'VCC' }, to: { component: 'ESP32', pin: '3.3V' }, wire: 'Red' },
      { from: { component: 'MPU6050', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'MPU6050', pin: 'SDA' }, to: { component: 'ESP32', pin: 'GPIO21' }, wire: 'Blue' },
      { from: { component: 'MPU6050', pin: 'SCL' }, to: { component: 'ESP32', pin: 'GPIO22' }, wire: 'Yellow' },
      { from: { component: 'BME280', pin: 'SDA' }, to: { component: 'ESP32', pin: 'GPIO21' }, wire: 'Green' },
      { from: { component: 'BME280', pin: 'SCL' }, to: { component: 'ESP32', pin: 'GPIO22' }, wire: 'Orange' },
      { from: { component: 'Motor1', pin: 'EN' }, to: { component: 'ESP32', pin: 'GPIO12' }, wire: 'White' },
      { from: { component: 'Motor2', pin: 'EN' }, to: { component: 'ESP32', pin: 'GPIO13' }, wire: 'Grey' },
      { from: { component: 'Motor3', pin: 'EN' }, to: { component: 'ESP32', pin: 'GPIO14' }, wire: 'Purple' },
      { from: { component: 'Motor4', pin: 'EN' }, to: { component: 'ESP32', pin: 'GPIO27' }, wire: 'Brown' },
    ],
    powerNeeds: '3.7V 2S LiPo, 10A burst, dedicated ESC per motor',
    tags: ['drone', 'quadcopter', 'imu', 'flight', 'motor', 'gps'],
  },
  {
    id: 'motion-alarm',
    name: 'PIR Motion Alarm System',
    description: 'Detects motion with PIR sensor, triggers buzzer and sends WiFi notification',
    category: 'security',
    complexity: 'beginner',
    components: ['esp32', 'sensor-pir', 'sensor-dht22'],
    connections: [
      { from: { component: 'PIR', pin: 'VCC' }, to: { component: 'ESP32', pin: '5V' }, wire: 'Red' },
      { from: { component: 'PIR', pin: 'OUT' }, to: { component: 'ESP32', pin: 'GPIO4' }, wire: 'Yellow' },
      { from: { component: 'PIR', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'DHT22', pin: 'VCC' }, to: { component: 'ESP32', pin: '3.3V' }, wire: 'Red' },
      { from: { component: 'DHT22', pin: 'DATA' }, to: { component: 'ESP32', pin: 'GPIO5' }, wire: 'Green' },
      { from: { component: 'DHT22', pin: 'GND' }, to: { component: 'ESP32', pin: 'GND' }, wire: 'Black' },
    ],
    powerNeeds: '5V 500mA via USB or battery',
    tags: ['security', 'alarm', 'pir', 'notification', 'wifi'],
  },
  {
    id: 'obstacle-avoiding-robot',
    name: 'Obstacle Avoiding Robot',
    description: 'Robot that navigates autonomously using ultrasonic distance sensor on servo scanner',
    category: 'robotics',
    complexity: 'intermediate',
    components: ['arduino-uno', 'sensor-hc-sr04', 'actuator-servo', 'actuator-dc-motor'],
    connections: [
      { from: { component: 'HC-SR04', pin: 'VCC' }, to: { component: 'Arduino', pin: '5V' }, wire: 'Red' },
      { from: { component: 'HC-SR04', pin: 'GND' }, to: { component: 'Arduino', pin: 'GND' }, wire: 'Black' },
      { from: { component: 'HC-SR04', pin: 'TRIG' }, to: { component: 'Arduino', pin: 'D9' }, wire: 'White' },
      { from: { component: 'HC-SR04', pin: 'ECHO' }, to: { component: 'Arduino', pin: 'D10' }, wire: 'Grey' },
      { from: { component: 'Servo', pin: 'Signal' }, to: { component: 'Arduino', pin: 'D6' }, wire: 'Orange' },
      { from: { component: 'L298N', pin: 'ENA' }, to: { component: 'Arduino', pin: 'D5' }, wire: 'Green' },
      { from: { component: 'L298N', pin: 'IN1' }, to: { component: 'Arduino', pin: 'D7' }, wire: 'Blue' },
      { from: { component: 'L298N', pin: 'IN2' }, to: { component: 'Arduino', pin: 'D8' }, wire: 'Purple' },
    ],
    powerNeeds: '5V 2A for motors, 500mA for Arduino',
    tags: ['robot', 'obstacle', 'ultrasonic', 'servo', 'autonomous'],
  },
];

// ═══════════════════════════════════════════════════════════════
// WIRING DIAGRAM GENERATOR
// ═══════════════════════════════════════════════════════════════

/**
 * Generate ASCII wiring diagram from connections
 */
export function generateWiringDiagram(diagram: WiringDiagram): string {
  let output = '';
  output += '╔══════════════════════════════════════════════════════════╗\n';
  output += `║  ${diagram.title.padEnd(54)}║\n`;
  output += '╠══════════════════════════════════════════════════════════╣\n';
  output += `║  ${diagram.description.substring(0, 54).padEnd(54)}║\n`;
  output += '╚══════════════════════════════════════════════════════════╝\n\n';

  // Components list
  output += '┌─── COMPONENTS ───────────────────────────────────────┐\n';
  for (const comp of diagram.components) {
    output += `│  ${comp.name.padEnd(40)} ${comp.voltage.padEnd(12)} │\n`;
  }
  output += '└───────────────────────────────────────────────────────┘\n\n';

  // Connections
  output += '┌─── WIRING ───────────────────────────────────────────┐\n';
  for (const conn of diagram.connections) {
    const wireColor = conn.wire || 'Any';
    const from = `${conn.from.component}.${conn.from.pin}`;
    const to = `${conn.to.component}.${conn.to.pin}`;
    output += `│  ${from.padEnd(25)} ──[${wireColor.padEnd(6)}]──▶ ${to.padEnd(20)}│\n`;
    if (conn.notes) {
      output += `│    └─ ${conn.notes.substring(0, 48).padEnd(49)}│\n`;
    }
  }
  output += '└───────────────────────────────────────────────────────┘\n\n';

  // Power requirements
  output += '┌─── POWER ────────────────────────────────────────────┐\n';
  for (const power of diagram.powerRequirements) {
    output += `│  ${power.component.padEnd(20)} ${power.voltage.padEnd(10)} ${power.current.padEnd(10)} │\n`;
  }
  output += '└───────────────────────────────────────────────────────┘\n\n';

  // Assembly steps
  output += '┌─── ASSEMBLY STEPS ──────────────────────────────────┐\n';
  for (let i = 0; i < diagram.assemblySteps.length; i++) {
    const step = `Step ${i + 1}: ${diagram.assemblySteps[i]}`;
    // Word wrap at 55 chars
    const lines = wordWrap(step, 55);
    for (const line of lines) {
      output += `│  ${line.padEnd(55)}│\n`;
    }
  }
  output += '└───────────────────────────────────────────────────────┘\n\n';

  // Tips
  if (diagram.tips.length > 0) {
    output += '┌─── TIPS ─────────────────────────────────────────────┐\n';
    for (const tip of diagram.tips) {
      const lines = wordWrap(`💡 ${tip}`, 55);
      for (const line of lines) {
        output += `│  ${line.padEnd(55)}│\n`;
      }
    }
    output += '└───────────────────────────────────────────────────────┘\n';
  }

  return output;
}

/**
 * Generate SVG wiring diagram
 */
export function generateWiringSVG(diagram: WiringDiagram): string {
  const width = 800;
  const height = 600;
  const compWidth = 120;
  const compHeight = 60;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#0a0e14;font-family:monospace">`;

  // Title
  svg += `<text x="${width/2}" y="30" text-anchor="middle" fill="#06b6d4" font-size="14" font-weight="bold">${diagram.title}</text>`;

  // Position components in a grid
  const cols = Math.ceil(Math.sqrt(diagram.components.length));
  const positions = diagram.components.map((comp, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: 60 + col * (compWidth + 60),
      y: 60 + row * (compHeight + 80),
    };
  });

  // Draw connections first (behind components)
  const colorMap: Record<string, string> = {
    'Red': '#ef4444', 'Black': '#374151', 'Blue': '#3b82f6',
    'Yellow': '#eab308', 'Green': '#22c55e', 'Orange': '#f97316',
    'Purple': '#a855f7', 'White': '#e5e7eb', 'Grey': '#9ca3af',
    'Brown': '#92400e', 'Pink': '#ec4899',
  };

  for (const conn of diagram.connections) {
    const fromIdx = diagram.components.findIndex(c => c.name === conn.from.component || c.id === conn.from.component);
    const toIdx = diagram.components.findIndex(c => c.name === conn.to.component || c.id === conn.to.component);
    if (fromIdx >= 0 && toIdx >= 0) {
      const from = positions[fromIdx];
      const to = positions[toIdx];
      const color = colorMap[conn.wire || ''] || '#6b7280';
      svg += `<line x1="${from.x + compWidth/2}" y1="${from.y + compHeight}" x2="${to.x + compWidth/2}" y2="${to.y}" stroke="${color}" stroke-width="2" stroke-dasharray="4,2" opacity="0.7"/>`;
    }
  }

  // Draw components
  for (let i = 0; i < diagram.components.length; i++) {
    const comp = diagram.components[i];
    const pos = positions[i];

    const categoryColors: Record<string, string> = {
      microcontroller: '#06b6d4',
      sensor: '#22c55e',
      actuator: '#f97316',
      power: '#ef4444',
      communication: '#a855f7',
      display: '#3b82f6',
      passive: '#6b7280',
    };

    const color = categoryColors[comp.category] || '#6b7280';

    // Component box
    svg += `<rect x="${pos.x}" y="${pos.y}" width="${compWidth}" height="${compHeight}" rx="8" fill="#0f172a" stroke="${color}" stroke-width="2"/>`;

    // Component name
    const shortName = comp.name.length > 16 ? comp.name.substring(0, 14) + '..' : comp.name;
    svg += `<text x="${pos.x + compWidth/2}" y="${pos.y + 25}" text-anchor="middle" fill="${color}" font-size="10" font-weight="bold">${shortName}</text>`;

    // Voltage
    svg += `<text x="${pos.x + compWidth/2}" y="${pos.y + 42}" text-anchor="middle" fill="#9ca3af" font-size="9">${comp.voltage}</text>`;

    // Category badge
    svg += `<text x="${pos.x + compWidth/2}" y="${pos.y + 55}" text-anchor="middle" fill="${color}" font-size="7" opacity="0.6">${comp.category.toUpperCase()}</text>`;

    // Pin dots
    svg += `<circle cx="${pos.x}" cy="${pos.y + compHeight/2}" r="4" fill="${color}" opacity="0.8"/>`;
    svg += `<circle cx="${pos.x + compWidth}" cy="${pos.y + compHeight/2}" r="4" fill="${color}" opacity="0.8"/>`;
  }

  // Legend
  svg += `<text x="20" y="${height - 30}" fill="#9ca3af" font-size="10">`;
  svg += `Components: ${diagram.components.length} | Connections: ${diagram.connections.length}`;
  svg += `</text>`;

  svg += '</svg>';
  return svg;
}

/**
 * Generate BOM (Bill of Materials)
 */
export function generateBOM(diagram: WiringDiagram): string {
  let bom = '╔══════════════════════════════════════════════════════════╗\n';
  bom += '║            BILL OF MATERIALS (BOM)                     ║\n';
  bom += '╠══════════════════════════════════════════════════════════╣\n';
  bom += '║  # │ Component                    │ Qty │ Price        ║\n';
  bom += '╠══════════════════════════════════════════════════════════╣\n';

  diagram.components.forEach((comp, i) => {
    bom += `║ ${String(i + 1).padStart(2)} │ ${comp.name.substring(0, 28).padEnd(28)} │  1  │ ${comp.price.padEnd(12)} ║\n`;
  });

  // Add wires and breadboard
  bom += `║ ${String(diagram.components.length + 1).padStart(2)} │ ${'Jumper Wires (M-M, M-F)'.padEnd(28)} │  1  │ $3.00        ║\n`;
  bom += `║ ${String(diagram.components.length + 2).padStart(2)} │ ${'Breadboard (Full Size)'.padEnd(28)} │  1  │ $5.00        ║\n`;

  bom += '╠══════════════════════════════════════════════════════════╣\n';
  bom += '║                                          TOTAL: ~$XX   ║\n';
  bom += '╚══════════════════════════════════════════════════════════╝\n';

  return bom;
}

// ═══════════════════════════════════════════════════════════════
// ARCHITECTURE RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze a project description and recommend architecture
 */
export function analyzeProject(description: string): ProjectAnalysis {
  const lower = description.toLowerCase();
  const tags = extractTags(lower);

  // Determine best microcontroller
  const needsWiFi = tags.some(t => ['wifi', 'cloud', 'iot', 'remote', 'app', 'web', 'http', 'mqtt'].includes(t));
  const needsBluetooth = tags.some(t => ['bluetooth', 'phone', 'audio', 'wireless-short'].includes(t));
  const needsAnalog = tags.some(t => ['analog', 'potentiometer', 'light', 'sound', 'voltage'].includes(t));
  const needsPower = tags.some(t => ['battery', 'portable', 'low-power', 'sleep'].includes(t));
  const isComplex = tags.some(t => ['robot', 'drone', 'cnc', '3d-printer', 'machine-learning'].includes(t));
  const needsDisplay = tags.some(t => ['display', 'screen', 'show', 'gui', 'interface', 'visual'].includes(t));

  let mcu: Component;
  if (needsWiFi || needsBluetooth) {
    mcu = COMPONENT_DB.find(c => c.id === 'esp32')!;
  } else if (isComplex) {
    mcu = COMPONENT_DB.find(c => c.id === 'arduino-uno')!;
  } else {
    mcu = COMPONENT_DB.find(c => c.id === 'raspberry-pi-pico')!;
  }

  // Determine sensors
  const sensors: Component[] = [];
  if (tags.some(t => ['temperature', 'weather', 'climate', 'humidity'].includes(t))) {
    sensors.push(COMPONENT_DB.find(c => c.id === 'sensor-bme280')!);
  }
  if (tags.some(t => ['distance', 'ultrasonic', 'proximity', 'obstacle', 'range'].includes(t))) {
    sensors.push(COMPONENT_DB.find(c => c.id === 'sensor-hc-sr04')!);
  }
  if (tags.some(t => ['motion', 'pir', 'detect', 'security', 'alarm', 'presence'].includes(t))) {
    sensors.push(COMPONENT_DB.find(c => c.id === 'sensor-pir')!);
  }
  if (tags.some(t => ['light', 'brightness', 'luminosity', 'ldr'].includes(t))) {
    sensors.push(COMPONENT_DB.find(c => c.id === 'sensor-ldr')!);
  }
  if (tags.some(t => ['gyro', 'imu', 'tilt', 'acceleration', 'orientation', 'motion-tracking', 'drone', 'balance'].includes(t))) {
    sensors.push(COMPONENT_DB.find(c => c.id === 'sensor-mpu6050')!);
  }
  if (tags.some(t => ['gas', 'smoke', 'fire', 'co', 'leak'].includes(t))) {
    sensors.push(COMPONENT_DB.find(c => c.id === 'sensor-gas-mq2')!);
  }

  // Determine actuators
  const actuators: Component[] = [];
  if (tags.some(t => ['motor', 'drive', 'wheel', 'car', 'vehicle', 'robot'].includes(t))) {
    actuators.push(COMPONENT_DB.find(c => c.id === 'actuator-dc-motor')!);
  }
  if (tags.some(t => ['servo', 'arm', 'gripper', 'door', 'lock', 'pan', 'tilt'].includes(t))) {
    actuators.push(COMPONENT_DB.find(c => c.id === 'actuator-servo')!);
  }
  if (tags.some(t => ['led', 'light', 'rgb', 'color', 'neopixel', 'strip', 'glow'].includes(t))) {
    actuators.push(COMPONENT_DB.find(c => c.id === 'actuator-neopixel')!);
  }
  if (tags.some(t => ['relay', 'switch', 'appliance', 'bulb', 'fan', 'ac', 'high-voltage'].includes(t))) {
    actuators.push(COMPONENT_DB.find(c => c.id === 'actuator-relay')!);
  }
  if (tags.some(t => ['stepper', 'precise', 'cnc', '3d-printer', 'position'].includes(t))) {
    actuators.push(COMPONENT_DB.find(c => c.id === 'actuator-stepper')!);
  }

  // Display
  const displays: Component[] = [];
  if (needsDisplay) {
    if (tags.some(t => ['color', 'graphics', 'image', 'photo', 'video', 'animation'].includes(t))) {
      displays.push(COMPONENT_DB.find(c => c.id === 'display-tft')!);
    } else {
      displays.push(COMPONENT_DB.find(c => c.id === 'display-oled')!);
    }
  }

  // Power
  const power: Component[] = [];
  if (needsPower || tags.some(t => ['battery', 'portable', 'wireless', 'remote'].includes(t))) {
    power.push(COMPONENT_DB.find(c => c.id === 'power-18650')!);
    power.push(COMPONENT_DB.find(c => c.id === 'power-boost')!);
  }

  // All components
  const allComponents = [mcu, ...sensors, ...actuators, ...displays, ...power].filter(Boolean);

  // Check for template match
  const templateMatch = findBestTemplate(tags);

  // Generate wiring
  const connections = templateMatch
    ? templateMatch.connections
    : generateGenericConnections(allComponents);

  const wiring: WiringDiagram = {
    title: `Project: ${description.substring(0, 40)}`,
    description: `Architecture for: ${description}`,
    components: allComponents,
    connections,
    powerRequirements: allComponents.map(c => ({
      component: c.name,
      voltage: c.voltage,
      current: estimateCurrent(c),
      source: c.category === 'power' ? 'Battery' : c.category === 'actuator' ? 'External 5V' : 'MCU 3.3V/5V',
    })),
    assemblySteps: generateAssemblySteps(allComponents, tags),
    tips: generateTips(tags, allComponents),
  };

  // Architecture layout
  const architecture: ArchitectureLayout = {
    blocks: allComponents.map((c, i) => ({
      id: c.id,
      name: c.name,
      type: categorizeBlockType(c),
      description: c.description,
      position: { x: (i % 3) * 200, y: Math.floor(i / 3) * 150 },
    })),
    connections: connections.map(c => ({
      from: c.from.component,
      to: c.to.component,
      type: c.from.pin.includes('VCC') || c.from.pin.includes('VIN') ? 'power' : 'data',
      protocol: detectProtocol(c),
      description: `${c.from.pin} → ${c.to.pin}`,
    })),
    dataFlow: generateDataFlow(allComponents, tags),
    powerDistribution: generatePowerDistribution(allComponents),
  };

  // Complexity and cost
  const totalComponents = allComponents.length;
  const complexity: ProjectAnalysis['complexity'] =
    totalComponents <= 2 ? 'beginner' :
    totalComponents <= 4 ? 'intermediate' :
    totalComponents <= 6 ? 'advanced' : 'expert';

  const estimatedCost = allComponents.reduce((sum, c) => {
    const price = parseFloat(c.price.replace('$', '')) || 5;
    return sum + price;
  }, 0);

  return {
    name: description.substring(0, 50),
    complexity,
    estimatedCost: `$${Math.round(estimatedCost)}-$${Math.round(estimatedCost * 1.5)}`,
    estimatedTime: complexity === 'beginner' ? '1-2 hours' : complexity === 'intermediate' ? '3-5 hours' : complexity === 'advanced' ? '1-2 days' : '3-5 days',
    components: allComponents,
    wiring,
    architecture,
    risks: generateRisks(allComponents, tags),
    alternatives: generateAlternatives(tags, mcu),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function extractTags(text: string): string[] {
  const tagPatterns = [
    'temperature', 'humidity', 'weather', 'climate',
    'distance', 'ultrasonic', 'proximity', 'obstacle', 'range',
    'motion', 'pir', 'detect', 'security', 'alarm', 'presence',
    'light', 'brightness', 'ldr', 'ldr',
    'gyro', 'imu', 'tilt', 'acceleration', 'orientation', 'balance',
    'gas', 'smoke', 'fire', 'co', 'leak',
    'motor', 'drive', 'wheel', 'car', 'vehicle', 'robot',
    'servo', 'arm', 'gripper', 'door', 'lock', 'pan',
    'led', 'rgb', 'color', 'neopixel', 'strip', 'glow',
    'relay', 'switch', 'appliance', 'bulb', 'fan', 'ac',
    'stepper', 'precise', 'cnc', '3d-printer', 'position',
    'wifi', 'cloud', 'iot', 'remote', 'app', 'web', 'http', 'mqtt',
    'bluetooth', 'phone', 'audio', 'wireless-short',
    'analog', 'potentiometer', 'sound', 'voltage',
    'battery', 'portable', 'low-power', 'sleep',
    'display', 'screen', 'show', 'gui', 'interface', 'visual',
    'drone', 'quadcopter', 'flight', 'gps',
    'camera', 'video', 'image', 'photo', 'vision',
    'rfid', 'nfc', 'card', 'access',
    'keyboard', 'input', 'button', 'touch',
    'speaker', 'buzzer', 'beep', 'sound-output',
    'pump', 'valve', 'water', 'irrigation',
    'solar', 'energy', 'harvest',
    'machine-learning', 'ai', 'neural', 'tensorflow',
  ];

  return tagPatterns.filter(tag => text.includes(tag));
}

function findBestTemplate(tags: string[]): ProjectTemplate | null {
  let bestMatch: ProjectTemplate | null = null;
  let bestScore = 0;

  for (const template of PROJECT_TEMPLATES) {
    const score = template.tags.filter(t => tags.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

function generateGenericConnections(components: Component[]): WiringConnection[] {
  const connections: WiringConnection[] = [];
  const mcu = components.find(c => c.category === 'microcontroller');
  if (!mcu) return connections;

  for (const comp of components) {
    if (comp.category === 'microcontroller') continue;

    const vccPin = comp.pins.find(p => p.type === 'power');
    const gndPin = comp.pins.find(p => p.type === 'ground');
    const dataPin = comp.pins.find(p => p.type === 'i2c' || p.type === 'digital' || p.type === 'analog' || p.type === 'spi' || p.type === 'uart' || p.type === 'pwm');

    if (vccPin) {
      const voltage = vccPin.voltage || comp.voltage;
      const powerPin = voltage.includes('3.3') ? '3.3V' : '5V';
      connections.push({
        from: { component: comp.name.split(' ')[0], pin: vccPin.name },
        to: { component: mcu.name.split(' ')[0], pin: powerPin },
        wire: 'Red',
      });
    }

    if (gndPin) {
      connections.push({
        from: { component: comp.name.split(' ')[0], pin: gndPin.name },
        to: { component: mcu.name.split(' ')[0], pin: 'GND' },
        wire: 'Black',
      });
    }

    if (dataPin) {
      let targetPin = 'D2';
      let wireColor = 'Blue';

      if (dataPin.type === 'i2c') {
        targetPin = dataPin.name.includes('SDA') ? 'SDA' : 'SCL';
        wireColor = dataPin.name.includes('SDA') ? 'Blue' : 'Yellow';
      } else if (dataPin.type === 'spi') {
        targetPin = dataPin.name;
        wireColor = 'Green';
      } else if (dataPin.type === 'uart') {
        targetPin = dataPin.name.includes('TX') ? 'RX' : 'TX';
        wireColor = 'Purple';
      } else if (dataPin.type === 'pwm') {
        targetPin = 'D9';
        wireColor = 'Orange';
      }

      connections.push({
        from: { component: comp.name.split(' ')[0], pin: dataPin.name },
        to: { component: mcu.name.split(' ')[0], pin: targetPin },
        wire: wireColor,
      });
    }
  }

  return connections;
}

function generateAssemblySteps(components: Component[], tags: string[]): string[] {
  const steps: string[] = [];

  steps.push('Gather all components and tools (soldering iron optional for breadboard)');
  steps.push('Place the microcontroller on the breadboard');

  const sensors = components.filter(c => c.category === 'sensor');
  const actuators = components.filter(c => c.category === 'actuator');

  if (sensors.length > 0) {
    steps.push(`Connect ${sensors.map(s => s.name).join(' and ')} to the microcontroller`);
    steps.push('Verify power connections (VCC and GND) before data connections');
  }

  if (actuators.length > 0) {
    steps.push(`Connect ${actuators.map(a => a.name).join(' and ')} to the microcontroller`);
    steps.push('Use external power supply for motors/relays if needed');
  }

  steps.push('Double-check all wiring before powering on');
  steps.push('Upload the firmware/code to the microcontroller');
  steps.push('Test each component individually');
  steps.push('Integrate all components and test the full system');

  return steps;
}

function generateTips(tags: string[], components: Component[]): string[] {
  const tips: string[] = [];

  if (components.some(c => c.category === 'actuator')) {
    tips.push('Use an external power supply for motors/relays — never power them directly from MCU pins');
  }
  if (components.some(c => c.id.startsWith('sensor-'))) {
    tips.push('Add 100nF decoupling capacitors near sensor VCC pins for stable readings');
  }
  if (components.some(c => c.pins.some(p => p.type === 'i2c'))) {
    tips.push('I2C devices need 4.7K pull-up resistors on SDA and SCL lines (most modules have them built-in)');
  }
  if (components.some(c => c.pins.some(p => p.type === 'pwm'))) {
    tips.push('Servos need a 50Hz PWM signal — use Arduino Servo library or ESP32 LEDC');
  }
  if (tags.includes('wifi') || tags.includes('iot')) {
    tips.push('Use MQTT protocol for IoT — it is lightweight and works great on ESP32');
  }
  if (tags.includes('battery') || tags.includes('portable')) {
    tips.push('Use deep sleep mode to extend battery life — ESP32 draws only 10uA in deep sleep');
  }
  if (tags.includes('security') || tags.includes('alarm')) {
    tips.push('Add a backup battery for the alarm system so it works during power outages');
  }
  tips.push('Start with a breadboard prototype before soldering a permanent PCB');
  tips.push('Document your wiring with photos — you will thank yourself later');

  return tips;
}

function generateRisks(components: Component[], tags: string[]): string[] {
  const risks: string[] = [];

  if (components.some(c => c.id.includes('dc-motor'))) {
    risks.push('Motors generate electrical noise — add flyback diodes and decoupling capacitors');
  }
  if (components.some(c => c.pins.some(p => p.type === 'pwm'))) {
    risks.push('Servos can draw 500mA+ spikes — use separate power supply');
  }
  if (tags.includes('outdoor') || tags.includes('weather')) {
    risks.push('Protect electronics from moisture with conformal coating or waterproof enclosure');
  }
  if (tags.includes('battery')) {
    risks.push('Lithium batteries need proper charging circuit (TP4056) — risk of fire if mishandled');
  }
  if (components.length > 5) {
    risks.push('Complex wiring increases chance of loose connections — consider using a PCB');
  }

  return risks;
}

function generateAlternatives(tags: string[], mcu: Component): string[] {
  const alternatives: string[] = [];

  if (mcu.id === 'esp32') {
    alternatives.push('Raspberry Pi Pico W — cheaper ($6), MicroPython support, but no Bluetooth');
    alternatives.push('Arduino Nano 33 IoT — WiFi + Arduino ecosystem, but less GPIO');
  } else if (mcu.id === 'arduino-uno') {
    alternatives.push('Arduino Mega — more pins (54 digital, 16 analog) for complex projects');
    alternatives.push('ESP32 — WiFi + Bluetooth + more processing power for $8');
  } else {
    alternatives.push('ESP32 — WiFi + Bluetooth for $8');
    alternatives.push('Arduino Uno — easier to learn, massive community support');
  }

  return alternatives;
}

function estimateCurrent(component: Component): string {
  const currentMap: Record<string, string> = {
    'microcontroller': '80-240mA',
    'sensor': '0.1-5mA',
    'actuator': '100-500mA',
    'display': '10-40mA',
    'communication': '80-170mA',
    'power': 'N/A',
    'passive': '0mA',
  };
  return currentMap[component.category] || 'Unknown';
}

function categorizeBlockType(component: Component): ArchitectureBlock['type'] {
  switch (component.category) {
    case 'sensor': return 'input';
    case 'microcontroller': return 'processing';
    case 'actuator': return 'output';
    case 'power': return 'power';
    case 'communication': return 'communication';
    case 'display': return 'output';
    case 'storage': return 'storage';
    default: return 'processing';
  }
}

function detectProtocol(conn: WiringConnection): string | undefined {
  const fromPin = conn.from.pin.toLowerCase();
  const toPin = conn.to.pin.toLowerCase();
  if (fromPin.includes('sda') || fromPin.includes('scl') || toPin.includes('sda') || toPin.includes('scl')) return 'I2C';
  if (fromPin.includes('mosi') || fromPin.includes('miso') || fromPin.includes('sck')) return 'SPI';
  if (fromPin.includes('tx') || fromPin.includes('rx')) return 'UART';
  if (fromPin.includes('pwm') || fromPin.includes('signal')) return 'PWM';
  return undefined;
}

function generateDataFlow(components: Component[], tags: string[]): string[] {
  const flow: string[] = [];
  const sensors = components.filter(c => c.category === 'sensor');
  const mcu = components.find(c => c.category === 'microcontroller');
  const actuators = components.filter(c => c.category === 'actuator');
  const displays = components.filter(c => c.category === 'display');
  const comms = components.filter(c => c.category === 'communication');

  if (sensors.length > 0) {
    flow.push(`Sensors [${sensors.map(s => s.name.split(' ')[0]).join(', ')}] → Collect environmental data`);
  }
  flow.push(`${mcu?.name || 'MCU'} → Process sensor data, run control logic`);
  if (actuators.length > 0) {
    flow.push(`${mcu?.name || 'MCU'} → Actuators [${actuators.map(a => a.name.split(' ')[0]).join(', ')}] → Physical output`);
  }
  if (displays.length > 0) {
    flow.push(`${mcu?.name || 'MCU'} → Display [${displays.map(d => d.name.split(' ')[0]).join(', ')}] → Visual feedback`);
  }
  if (comms.length > 0) {
    flow.push(`${mcu?.name || 'MCU'} → ${comms.map(c => c.name.split(' ')[0]).join(', ')} → Cloud/Phone`);
  }
  if (tags.includes('wifi') || tags.includes('cloud')) {
    flow.push('Cloud/Phone → Remote monitoring and control');
  }

  return flow;
}

function generatePowerDistribution(components: Component[]): string[] {
  const dist: string[] = [];
  const powerComponents = components.filter(c => c.category === 'power');
  const mcu = components.find(c => c.category === 'microcontroller');
  const actuators = components.filter(c => c.category === 'actuator');
  const sensors = components.filter(c => c.category === 'sensor');

  if (powerComponents.length > 0) {
    dist.push(`Battery → DC-DC Converter → Regulated power rail`);
  }
  if (mcu) {
    dist.push(`Power → ${mcu.name} → 3.3V/5V regulated output`);
  }
  if (sensors.length > 0) {
    dist.push(`${mcu?.name || 'MCU'} 3.3V → ${sensors.map(s => s.name.split(' ')[0]).join(', ')} (sensor power)`);
  }
  if (actuators.length > 0) {
    dist.push(`External 5V → ${actuators.map(a => a.name.split(' ')[0]).join(', ')} (motor/relay power)`);
  }
  dist.push('Common GND across all components');

  return dist;
}

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
