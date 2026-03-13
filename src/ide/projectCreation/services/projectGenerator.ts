// ============================================================================
// projectGenerator.ts - Complete Embedded/Arduino Project Generator
// With proper imports, exports and createProject function
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

// Type definition
interface ProjectOptions {
  name: string;
  location?: string;
  template: 'arduino' | 'esp32' | 'stm32' | 'generic-embedded';
  templateType?: string;
  board?: string;
  series?: string;
  framework?: string;
  language?: 'c' | 'cpp';
  includeSamples?: boolean;
  templateOptions?: any;
}

// ============================================================================
// MAIN EXPORT - createProject (called by project creation UI)
// ============================================================================

export async function createProject(options: ProjectOptions): Promise<{ success: boolean; projectPath: string; files: string[] }> {
  const projectName = options.name;
  const projectPath = options.location 
    ? path.join(options.location, projectName)
    : projectName;
  
  console.log(`[ProjectGenerator] Creating ${options.template} project: ${projectName}`);
  console.log(`[ProjectGenerator] Path: ${projectPath}`);
  
  try {
    // Create project directory
    await fs.promises.mkdir(projectPath, { recursive: true });
    
    // Generate files based on template
    await generateEmbeddedProject(projectPath, options);
    
    // Get list of created files
    const createdFiles = await listCreatedFiles(projectPath);
    
    console.log(`[ProjectGenerator] ✅ Created ${createdFiles.length} files`);
    
    return {
      success: true,
      projectPath,
      files: createdFiles
    };
  } catch (error: any) {
    console.error('[ProjectGenerator] Error:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }
}

// Helper to list files recursively
async function listCreatedFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subFiles = await listCreatedFiles(path.join(dirPath, entry.name));
        files.push(...subFiles.map(f => path.join(entry.name, f)));
      } else {
        files.push(entry.name);
      }
    }
  } catch (e) { /* ignore */ }
  return files;
}

// Generate base project directories
async function generateBaseProject(projectPath: string, options: ProjectOptions): Promise<void> {
  const dirs = ['src', 'include', 'lib', 'docs', 'test'];
  for (const dir of dirs) {
    await fs.promises.mkdir(path.join(projectPath, dir), { recursive: true });
  }
}

// Generate embedded project
async function generateEmbeddedProject(projectPath: string, options: ProjectOptions): Promise<void> {
  // First generate base project
  await generateBaseProject(projectPath, options);
  
  console.log(`Generating ${options.template} embedded project...`);

  // Common directories for embedded projects
  const directories = [
    'src',
    'include',
    'lib',
    'docs',
    'test'
  ];

  // Create directories
  for (const dir of directories) {
    await fs.promises.mkdir(path.join(projectPath, dir), { recursive: true });
  }

  // Common files for all embedded projects
  const commonFiles = [
    {
      path: 'README.md',
      content: `# ${options.name || 'Embedded Project'}

An embedded software project created with Deepseek IDE.

## Hardware Requirements

- ${options.template === 'arduino' ? 'Arduino ' + (options.board || 'Uno') : 
    options.template === 'stm32' ? 'STM32 ' + (options.series || 'F4') + ' Development Board' : 
    options.template === 'esp32' ? 'ESP32 Development Board' : 
    'Microcontroller Development Board'}
- USB Cable
- ${options.template === 'arduino' ? 'Arduino IDE or compatible compiler' :
    options.template === 'stm32' ? 'STM32CubeIDE or compatible toolchain' :
    options.template === 'esp32' ? 'ESP-IDF or Arduino IDE with ESP32 support' :
    'GCC ARM toolchain or compatible compiler'}

## Setup

1. Connect your board to your computer
2. Install required toolchain
3. Build and flash the firmware

## Building and Flashing

\`\`\`
${options.template === 'arduino' ? '# Using Arduino CLI\narduino-cli compile -b arduino:avr:uno .\narduino-cli upload -b arduino:avr:uno -p /dev/ttyUSB0 .' :
  options.template === 'stm32' ? '# Using make\nmake\n# Flash with ST-Link\nmake flash' :
  options.template === 'esp32' ? options.framework === 'esp-idf' ? 'idf.py build\nidf.py -p /dev/ttyUSB0 flash' : 'arduino-cli compile -b esp32:esp32:esp32 .\narduino-cli upload -b esp32:esp32:esp32 -p /dev/ttyUSB0 .' :
  '# Using make\nmake\n# Flash with programmer\nmake flash'}
\`\`\`
`
    },
    {
      path: '.gitignore',
      content: `# Build artifacts
build/
*.o
*.elf
*.bin
*.hex
*.map
*.lst

# IDEs and editors
.vscode/
.idea/
*.swp
*.swo

# Dependencies
lib/
vendor/

# Debug files
.gdb_history
debug.log

# Platform-specific
${options.template === 'arduino' ? '.arduino/' :
  options.template === 'stm32' ? '.settings/\nDebug/\nRelease/' :
  options.template === 'esp32' ? 'sdkconfig\nsdkconfig.old' :
  ''}`
    }
  ];

  // Template-specific files
  let specificFiles = [];
  
  switch (options.template) {
    case 'arduino':
      specificFiles = await generateArduinoFiles(options);
      break;
    case 'stm32':
      specificFiles = await generateSTM32Files(options);
      break;
    case 'esp32':
      specificFiles = await generateESP32Files(options);
      break;
    case 'generic-embedded':
    default:
      specificFiles = await generateGenericEmbeddedFiles(options);
      break;
  }
  
  // Write all files
  const allFiles = [...commonFiles, ...specificFiles];
  for (const file of allFiles) {
    const filePath = path.join(projectPath, file.path);
    const fileDir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.promises.mkdir(fileDir, { recursive: true });
    
    // Write file content
    await fs.promises.writeFile(filePath, file.content);
    console.log(`Created file: ${file.path}`);
  }
}

// Generate Arduino files
async function generateArduinoFiles(options: ProjectOptions): Promise<any[]> {
  const files = [
    {
      path: `${options.name || 'ArduinoProject'}.ino`,
      content: `/*
 * ${options.name || 'Arduino Project'}
 * 
 * Created with Deepseek IDE
 */

// Pin definitions
#define LED_PIN 13

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  Serial.println("${options.name || 'Arduino Project'} starting...");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // Toggle LED
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
  
  // Print message
  Serial.println("Hello from Arduino!");
}
`
    }
  ];
  
  // Add sample sketches if requested
  if (options.includeSamples) {
    files.push({
      path: 'examples/BlinkWithoutDelay/BlinkWithoutDelay.ino',
      content: `/*
 * Blink without delay
 * 
 * Shows how to blink an LED without using delay()
 */

const int ledPin = 13;
unsigned long previousMillis = 0;
const long interval = 1000;
int ledState = LOW;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    if (ledState == LOW) {
      ledState = HIGH;
    } else {
      ledState = LOW;
    }
    
    digitalWrite(ledPin, ledState);
  }
}
`
    });
  }
  
  return files;
}

// Generate STM32 files
async function generateSTM32Files(options: ProjectOptions): Promise<any[]> {
  const files = [
    {
      path: 'src/main.c',
      content: `/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "main.h"

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{
  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* Configure the system clock */
  SystemClock_Config();

  /* Initialize all configured peripherals */
  MX_GPIO_Init();

  /* Infinite loop */
  while (1)
  {
    /* Toggle LED */
    HAL_GPIO_TogglePin(LD2_GPIO_Port, LD2_Pin);
    HAL_Delay(1000);
  }
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  // Clock configuration code here
}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOA_CLK_ENABLE();

  /* Configure GPIO pin : LD2_Pin */
  GPIO_InitStruct.Pin = LD2_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(LD2_GPIO_Port, &GPIO_InitStruct);
}
`
    },
    {
      path: 'include/main.h',
      content: `/**
  ******************************************************************************
  * @file           : main.h
  * @brief          : Header for main.c file
  ******************************************************************************
  */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef __MAIN_H
#define __MAIN_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32${options.series || 'f4'}xx_hal.h"

/* Exported types ------------------------------------------------------------*/

/* Exported constants --------------------------------------------------------*/

/* Exported macro ------------------------------------------------------------*/

/* Exported functions prototypes ---------------------------------------------*/
void Error_Handler(void);

/* Private defines -----------------------------------------------------------*/
#define LD2_Pin GPIO_PIN_5
#define LD2_GPIO_Port GPIOA

#ifdef __cplusplus
}
#endif

#endif /* __MAIN_H */
`
    },
    {
      path: 'Makefile',
      content: `# Makefile for STM32 project

# Project name
PROJECT = ${options.name || 'STM32Project'}

# Toolchain
CC = arm-none-eabi-gcc
OBJCOPY = arm-none-eabi-objcopy
SIZE = arm-none-eabi-size

# Paths
BUILD_DIR = build
SRC_DIR = src
INC_DIR = include

# Source files
SRCS = $(wildcard $(SRC_DIR)/*.c)
OBJS = $(addprefix $(BUILD_DIR)/,$(notdir $(SRCS:.c=.o)))

# MCU flags
MCU = -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16

# Compiler flags
CFLAGS = $(MCU) -Wall -g3 -O0 -I$(INC_DIR)

# Targets
all: $(BUILD_DIR)/$(PROJECT).elf $(BUILD_DIR)/$(PROJECT).hex $(BUILD_DIR)/$(PROJECT).bin

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
  $(CC) -c $(CFLAGS) $< -o $@

$(BUILD_DIR)/$(PROJECT).elf: $(OBJS)
  $(CC) $(OBJS) $(CFLAGS) -o $@
  $(SIZE) $@

$(BUILD_DIR)/$(PROJECT).hex: $(BUILD_DIR)/$(PROJECT).elf
  $(OBJCOPY) -O ihex $< $@

$(BUILD_DIR)/$(PROJECT).bin: $(BUILD_DIR)/$(PROJECT).elf
  $(OBJCOPY) -O binary -S $< $@

$(BUILD_DIR):
  mkdir -p $@

clean:
  rm -rf $(BUILD_DIR)

flash:
  st-flash write $(BUILD_DIR)/$(PROJECT).bin 0x8000000

.PHONY: all clean flash
`
    }
  ];
  
  // Add FreeRTOS if requested
  if (options.useRTOS) {
    files.push({
      path: 'src/freertos.c',
      content: `/**
  ******************************************************************************
  * @file           : freertos.c
  * @brief          : FreeRTOS initialization
  ******************************************************************************
  */

/* Includes ------------------------------------------------------------------*/
#include "FreeRTOS.h"
#include "task.h"
#include "main.h"
#include "cmsis_os.h"

/* Private variables ---------------------------------------------------------*/
osThreadId defaultTaskHandle;

/* Private function prototypes -----------------------------------------------*/
void StartDefaultTask(void const * argument);

/**
  * @brief  FreeRTOS initialization
  * @param  None
  * @retval None
  */
void MX_FREERTOS_Init(void) {
  /* Create the thread(s) */
  osThreadDef(defaultTask, StartDefaultTask, osPriorityNormal, 0, 128);
  defaultTaskHandle = osThreadCreate(osThread(defaultTask), NULL);
}

/**
  * @brief  Default task function
  * @param  argument: Not used
  * @retval None
  */
void StartDefaultTask(void const * argument) {
  /* Infinite loop */
  for(;;) {
    /* Toggle LED */
    HAL_GPIO_TogglePin(LD2_GPIO_Port, LD2_Pin);
    osDelay(1000);
  }
}
`
    });
  }
  
  return files;
}

// Generate ESP32 files
async function generateESP32Files(options: ProjectOptions): Promise<any[]> {
  const files = [];
  
  if (options.framework === 'esp-idf') {
    // ESP-IDF framework
    files.push(
      {
        path: 'main/main.c',
        content: `/* ESP-IDF Main
 * 
 * ${options.name || 'ESP32 Project'}
 */

#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "sdkconfig.h"

/* LED GPIO pin */
#define LED_PIN 2

void app_main(void)
{
    /* Configure LED pin */
    gpio_pad_select_gpio(LED_PIN);
    gpio_set_direction(LED_PIN, GPIO_MODE_OUTPUT);

    printf("${options.name || 'ESP32 Project'} starting...\\n");

    while (1) {
        /* Blink LED */
        gpio_set_level(LED_PIN, 1);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
        gpio_set_level(LED_PIN, 0);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
        
        printf("Hello from ESP32!\\n");
    }
}
`
      },
      {
        path: 'CMakeLists.txt',
        content: `# ESP-IDF CMake project
cmake_minimum_required(VERSION 3.5)

set(EXTRA_COMPONENT_DIRS $ENV{IDF_PATH}/examples/common_components/protocol_examples_common)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(${options.name || 'esp32_project'})
`
      },
      {
        path: 'main/CMakeLists.txt',
        content: `# Main component CMakeLists file
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS ".")
`
      }
    );
    
    // Add WiFi support if requested
    if (options.withWifi) {
      files.push({
        path: 'main/wifi.c',
        content: `/* WiFi Station Example
 * 
 * Connects to WiFi network
 */

#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"

#include "lwip/err.h"
#include "lwip/sys.h"

/* WiFi configuration */
#define WIFI_SSID      "YOUR_SSID"
#define WIFI_PASS      "YOUR_PASSWORD"
#define MAXIMUM_RETRY  5

static EventGroupHandle_t s_wifi_event_group;
static const char *TAG = "wifi_station";
static int s_retry_num = 0;

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT      BIT1

static void event_handler(void* arg, esp_event_base_t event_base,
                                int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < MAXIMUM_RETRY) {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGI(TAG, "Retry to connect to the AP");
        } else {
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
        }
        ESP_LOGI(TAG,"Connect to the AP fail");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI(TAG, "Got IP:" IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

void wifi_init_sta(void)
{
    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());

    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
            .pmf_cfg = {
                .capable = true,
                .required = false
            },
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA) );
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_STA, &wifi_config) );
    ESP_ERROR_CHECK(esp_wifi_start() );

    ESP_LOGI(TAG, "wifi_init_sta finished.");

    /* Waiting until either the connection is established or connection failed */
    EventBits_t bits = xEventGroupWaitBits(s_wifi_event_group,
            WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
            pdFALSE,
            pdFALSE,
            portMAX_DELAY);

    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "Connected to AP SSID:%s", WIFI_SSID);
    } else if (bits & WIFI_FAIL_BIT) {
        ESP_LOGI(TAG, "Failed to connect to SSID:%s", WIFI_SSID);
    } else {
        ESP_LOGE(TAG, "UNEXPECTED EVENT");
    }
}
`
      });
    }
    
  } else {
    // Arduino framework for ESP32
    files.push({
      path: `${options.name || 'ESP32Project'}.ino`,
      content: `/*
 * ${options.name || 'ESP32 Project'}
 * 
 * Created with Deepseek IDE
 */

// Pin definitions
#define LED_PIN 2

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Serial.println("${options.name || 'ESP32 Project'} starting...");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
${options.withWifi ? `
  // Connect to WiFi
  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");
  
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());` : ''}
${options.withBLE ? `
  // Initialize BLE
  BLEDevice::init("${options.name || 'ESP32-BLE'}");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID,
                                         BLECharacteristic::PROPERTY_READ |
                                         BLECharacteristic::PROPERTY_WRITE
                                       );

  pCharacteristic->setValue("Hello from ESP32 BLE");
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
  Serial.println("BLE device active, ready to connect");` : ''}
}

void loop() {
  // Toggle LED
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
  
  // Print message
  Serial.println("Hello from ESP32!");
}
`
    });
    
    // Add WiFi and BLE libraries if needed
    if (options.withWifi) {
      files.push({
        path: 'src/wifi_setup.h',
        content: `#ifndef WIFI_SETUP_H
#define WIFI_SETUP_H

#include <WiFi.h>

// WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

void connectToWiFi() {
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

#endif // WIFI_SETUP_H
`
      });
    }
    
    if (options.withBLE) {
      files.push({
        path: 'src/ble_setup.h',
        content: `#ifndef BLE_SETUP_H
#define BLE_SETUP_H

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// BLE UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* setupBLE(const char* deviceName) {
  BLEDevice::init(deviceName);
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
                                         CHARACTERISTIC_UUID,
                                         BLECharacteristic::PROPERTY_READ |
                                         BLECharacteristic::PROPERTY_WRITE
                                       );

  pCharacteristic->setValue("Hello from ESP32 BLE");
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
  
  return pServer;
}

#endif // BLE_SETUP_H
`
      });
    }
  }
  
  return files;
}

// Generate generic embedded files
async function generateGenericEmbeddedFiles(options: ProjectOptions): Promise<any[]> {
  // Base files for generic embedded project
  const files = [
    {
      path: 'src/main.' + (options.language === 'cpp' ? 'cpp' : 'c'),
      content: `/**
 * ${options.name || 'Generic Embedded Project'}
 * 
 * Created with Deepseek IDE
 */

${options.language === 'cpp' ? '#include <cstdio>\n#include <cstdint>' : '#include <stdio.h>\n#include <stdint.h>'}

${options.useRTOS ? `// RTOS includes
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"

// Task handles
TaskHandle_t ledTaskHandle = NULL;

// LED toggle task
void ledTask(void *pvParameters) {
    // Configure LED pin (hardware specific)
    
    while (1) {
        // Toggle LED
        // LED_TOGGLE();
        
        // Delay
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
}` : '// Function prototypes'}

/**
 * Main function
 */
${options.language === 'cpp' ? 'int main(void)' : 'int main(void)'}
{
    // Initialize system
    
    ${options.useRTOS ? `// Create tasks
    xTaskCreate(ledTask, "LED_Task", 128, NULL, 1, &ledTaskHandle);
    
    // Start scheduler
    vTaskStartScheduler();
    
    // Should never reach here
    while (1) {
        // Error trap
    }` : `// Main loop
    while (1) {
        // Toggle LED
        
        // Delay
        for (uint32_t i = 0; i < 1000000; i++) {
            __asm__("nop");
        }
    }`}
    
    return 0;
}
`
    },
    {
      path: 'include/main.' + (options.language === 'cpp' ? 'hpp' : 'h'),
      content: `/**
 * ${options.name || 'Generic Embedded Project'}
 * 
 * Header file
 */

#ifndef MAIN_${options.language === 'cpp' ? 'HPP' : 'H'}
#define MAIN_${options.language === 'cpp' ? 'HPP' : 'H'}

${options.language === 'cpp' ? '#include <cstdint>' : '#include <stdint.h>'}

// Pin definitions
#define LED_PIN   (5)

${options.language === 'cpp' ? '// C++ specific declarations\n\nclass LedController {\npublic:\n    void init();\n    void toggle();\n\nprivate:\n    bool state = false;\n};' : '// C specific declarations\n\n// Function prototypes\nvoid led_init(void);\nvoid led_toggle(void);'}

#endif // MAIN_${options.language === 'cpp' ? 'HPP' : 'H'}
`
    }
  ];
  
  // Add Makefile or CMake
  if (options.useCMake) {
    files.push({
      path: 'CMakeLists.txt',
      content: `cmake_minimum_required(VERSION 3.12)

project(${options.name || 'EmbeddedProject'} C ${options.language === 'cpp' ? 'CXX' : ''})

# Set compiler flags
set(CMAKE_${options.language === 'cpp' ? 'CXX' : 'C'}_FLAGS "\${CMAKE_${options.language === 'cpp' ? 'CXX' : 'C'}_FLAGS} -Wall -Wextra")

# Include directories
include_directories(include)

# Source files
file(GLOB_RECURSE SOURCES "src/*.${options.language === 'cpp' ? 'cpp' : 'c'}")

# Target executable
add_executable(\${PROJECT_NAME} \${SOURCES})

# Libraries
${options.useRTOS ? 'add_subdirectory(lib/FreeRTOS)\ntarget_link_libraries(${PROJECT_NAME} freertos)' : '# Add libraries here'}
`
    });
  } else {
    files.push({
      path: 'Makefile',
      content: `# Makefile for ${options.name || 'Embedded Project'}

# Project name
PROJECT = ${options.name || 'embedded_project'}

# Toolchain
${options.language === 'cpp' ? 'CXX = arm-none-eabi-g++\nCC = arm-none-eabi-gcc' : 'CC = arm-none-eabi-gcc'}
OBJCOPY = arm-none-eabi-objcopy
SIZE = arm-none-eabi-size

# Paths
BUILD_DIR = build
SRC_DIR = src
INC_DIR = include

# Source files
${options.language === 'cpp' ? 'SRCS = $(wildcard $(SRC_DIR)/*.cpp)' : 'SRCS = $(wildcard $(SRC_DIR)/*.c)'}
${options.language === 'cpp' ? 'OBJS = $(addprefix $(BUILD_DIR)/,$(notdir $(SRCS:.cpp=.o)))' : 'OBJS = $(addprefix $(BUILD_DIR)/,$(notdir $(SRCS:.c=.o)))'}

# MCU flags
MCU = -mcpu=cortex-m0plus -mthumb

# Compiler flags
${options.language === 'cpp' ? 'CXXFLAGS = $(MCU) -Wall -g3 -O0 -I$(INC_DIR) -std=c++11 -fno-exceptions -fno-rtti' : 'CFLAGS = $(MCU) -Wall -g3 -O0 -I$(INC_DIR) -std=c11'}

# Targets
all: $(BUILD_DIR)/$(PROJECT).elf $(BUILD_DIR)/$(PROJECT).hex $(BUILD_DIR)/$(PROJECT).bin

${options.language === 'cpp' ? '$(BUILD_DIR)/%.o: $(SRC_DIR)/%.cpp | $(BUILD_DIR)\n\t$(CXX) -c $(CXXFLAGS) $< -o $@' : '$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)\n\t$(CC) -c $(CFLAGS) $< -o $@'}

$(BUILD_DIR)/$(PROJECT).elf: $(OBJS)
\t${options.language === 'cpp' ? '$(CXX) $(OBJS) $(CXXFLAGS)' : '$(CC) $(OBJS) $(CFLAGS)'} -o $@
\t$(SIZE) $@

$(BUILD_DIR)/$(PROJECT).hex: $(BUILD_DIR)/$(PROJECT).elf
\t$(OBJCOPY) -O ihex $< $@

$(BUILD_DIR)/$(PROJECT).bin: $(BUILD_DIR)/$(PROJECT).elf
\t$(OBJCOPY) -O binary -S $< $@

$(BUILD_DIR):
\tmkdir -p $@

clean:
\trm -rf $(BUILD_DIR)

flash:
\t# Add your flash command here, e.g.:
\t# openocd -f interface/stlink.cfg -f target/stm32f0x.cfg -c "program $(BUILD_DIR)/$(PROJECT).elf verify reset exit"

.PHONY: all clean flash
`
    });
  }
  
  // Add linker script
  files.push({
    path: 'linker.ld',
    content: `/* Linker script for generic Cortex-M microcontroller */

MEMORY
{
  FLASH (rx)      : ORIGIN = 0x08000000, LENGTH = 64K
  RAM (xrw)       : ORIGIN = 0x20000000, LENGTH = 8K
}

/* Entry Point */
ENTRY(Reset_Handler)

/* Sections */
SECTIONS
{
  .text :
  {
    KEEP(*(.isr_vector))
    *(.text*)
    *(.rodata*)
    . = ALIGN(4);
  } > FLASH

  .data :
  {
    . = ALIGN(4);
    _sdata = .;
    *(.data*)
    . = ALIGN(4);
    _edata = .;
  } > RAM AT> FLASH

  _sidata = LOADADDR(.data);

  .bss :
  {
    . = ALIGN(4);
    _sbss = .;
    *(.bss*)
    *(COMMON)
    . = ALIGN(4);
    _ebss = .;
  } > RAM
}
`
  });
  
  return files;
}


// ============================================================================
// EXPORTS
// ============================================================================

// Export all functions
export {
  generateEmbeddedProject,
  generateArduinoFiles,
  generateSTM32Files,
  generateESP32Files,
  generateGenericEmbeddedFiles,
  ProjectOptions
};

// Default export
export default createProject;
