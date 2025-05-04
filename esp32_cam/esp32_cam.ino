#include "esp_camera.h"
#include <WiFi.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "esp_http_server.h"

// Replace with your Wi-Fi credentials
// const char *ssid = "VAN SAU";
// const char *password = "0945248236";

const char *ssid = "Minh Duc";
const char *password = "26102003";

#define PART_BOUNDARY "123456789000000000000987654321"

#define CAMERA_MODEL_AI_THINKER
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;
camera_config_t camera_config; // Global declaration

// Function declarations
void configure_camera_for_quality(sensor_t * s, bool high_quality);
void checkAndResetCamera();

// Hàm cấu hình camera cho chất lượng cao
void configure_camera_for_quality(sensor_t * s, bool high_quality) {
  if (s) {
    if (high_quality) {
      // Cài đặt cho chất lượng cao khi chụp ảnh
      s->set_framesize(s, FRAMESIZE_XGA);  // 1024x768 (more stable than UXGA)
      s->set_quality(s, 10);               // Chất lượng JPEG cao hơn (lower = better, range 4-63)
      s->set_brightness(s, 1);             // Độ sáng (-2 đến 2)
      s->set_contrast(s, 1);               // Độ tương phản (-2 đến 2)
      s->set_saturation(s, 0);             // Độ bão hòa (-2 đến 2)
      s->set_sharpness(s, 1);              // Độ sắc nét (-2 đến 2)
      s->set_denoise(s, 1);                // Giảm nhiễu
      s->set_gainceiling(s, GAINCEILING_4X); // Tăng độ nhạy sáng
      s->set_whitebal(s, 1);               // Cân bằng trắng tự động
      s->set_awb_gain(s, 1);               // Tăng ích cân bằng trắng
      s->set_wb_mode(s, 0);                // 0-4, auto white balance
      s->set_exposure_ctrl(s, 1);          // Điều khiển phơi sáng tự động
      s->set_aec2(s, 1);                   // AEC tự động
      s->set_ae_level(s, 0);               // Mức phơi sáng (-2 đến 2)
      s->set_aec_value(s, 300);            // Giá trị phơi sáng (0-1200)
      s->set_gain_ctrl(s, 1);              // Điều khiển gain tự động
      s->set_agc_gain(s, 0);               // Mức AGC (0-30)
      s->set_bpc(s, 1);                    // Black pixel correction
      s->set_wpc(s, 1);                    // White pixel correction
      s->set_raw_gma(s, 1);                // Raw gamma
      s->set_lenc(s, 1);                   // Lens correction
      s->set_hmirror(s, 0);                // Lật ngang (0 hoặc 1)
      s->set_vflip(s, 0);                  // Lật dọc (0 hoặc 1)
      s->set_dcw(s, 1);                    // Downsize EN
    } else {
      // Cài đặt cho streaming mượt
      s->set_framesize(s, FRAMESIZE_VGA);  // 640x480 cho streaming
      s->set_quality(s, 10);               // Cân bằng giữa chất lượng và tốc độ
      s->set_brightness(s, 0);
      s->set_contrast(s, 0);
      s->set_saturation(s, 0);
      s->set_sharpness(s, 0);
      s->set_denoise(s, 0);
      s->set_gainceiling(s, GAINCEILING_2X);
    }
  }
}
static httpd_req_t* current_stream_req = NULL;
static esp_err_t stream_handler(httpd_req_t *req){
  if (current_stream_req != NULL) {
    httpd_resp_sendstr_chunk(current_stream_req, NULL);
    current_stream_req = NULL;
    // Brief delay to allow previous connection to close
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
  current_stream_req = req;

  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[128];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if(res != ESP_OK) return res;

  // CORS headers đầy đủ cho stream
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type");
  httpd_resp_set_hdr(req, "Cross-Origin-Resource-Policy", "cross-origin");
  httpd_resp_set_hdr(req, "Cross-Origin-Embedder-Policy", "require-corp");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache, no-store, must-revalidate");
  httpd_resp_set_hdr(req, "Pragma", "no-cache");
  httpd_resp_set_hdr(req, "Expires", "0");

  // Cấu hình camera cho streaming
  sensor_t * s = esp_camera_sensor_get();
  configure_camera_for_quality(s, false);

  int64_t fr_start = esp_timer_get_time();
  int frame_count = 0;

  while(true){
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Stream: Failed to get camera frame buffer");
      res = ESP_FAIL;
      break;
    }

    if(fb->format != PIXFORMAT_JPEG){
      bool jpeg_converted = frame2jpg(fb, 85, &_jpg_buf, &_jpg_buf_len); // Chất lượng JPEG cao hơn
      esp_camera_fb_return(fb);
      fb = NULL;
      if(!jpeg_converted){
        Serial.println("Stream: JPEG compression failed");
        res = ESP_FAIL;
        break;
      }
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }

    size_t hlen = snprintf((char *)part_buf, 128, _STREAM_PART, _jpg_buf_len);
    res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    if(res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    if(res == ESP_OK) res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));

    if(fb) esp_camera_fb_return(fb);
    if(_jpg_buf && fb == NULL) free(_jpg_buf);

    if(res != ESP_OK) {
      Serial.println("Stream: Failed to send frame");
      break;
    }

    frame_count++;
    // Print framerate every 100 frames
    if (frame_count >= 100) {
      int64_t fr_end = esp_timer_get_time();
      float fps = frame_count * 1000000.0 / (fr_end - fr_start);
      Serial.printf("Stream: %0.1f fps\n", fps);
      frame_count = 0;
      fr_start = fr_end;
    }

    // Yield to allow other tasks to run
    vTaskDelay(5 / portTICK_PERIOD_MS);
  }

  Serial.println("Stream handler exited");
  current_stream_req = NULL;
  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  // Set timeout and clear existing resources
  unsigned long startTime = millis();
  const unsigned long CAPTURE_TIMEOUT = 8000; // 8 seconds max
  
  // Prepare response headers - important for CORS
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache, no-store, must-revalidate");
  httpd_resp_set_hdr(req, "Cross-Origin-Resource-Policy", "cross-origin");
  
  // Flush any previous frames
  camera_fb_t *fb = NULL;
  fb = esp_camera_fb_get();
  if (fb) {
    esp_camera_fb_return(fb);
    fb = NULL;
  }
  
  // Configure camera for high quality capture with better exposure
  sensor_t *s = esp_camera_sensor_get();
  if (!s) {
    httpd_resp_set_status(req, "500 Internal Server Error");
    httpd_resp_send(req, "Camera sensor not available", HTTPD_RESP_USE_STRLEN);
    return ESP_FAIL;
  }
  
  // Save original settings to restore later
  framesize_t orig_framesize = (framesize_t)s->status.framesize;
  int orig_quality = s->status.quality;
  int orig_brightness = s->status.brightness;
  int orig_contrast = s->status.contrast;
  int orig_saturation = s->status.saturation;
  int orig_ae_level = s->status.ae_level;
  int orig_aec_value = s->status.aec_value;
  gainceiling_t orig_gainceiling = (gainceiling_t)s->status.gainceiling;
  
  // Apply optimized settings for capture (brighter image)
  s->set_framesize(s, FRAMESIZE_VGA);     // VGA for reliability
  s->set_quality(s, 10);                  // Good quality
  s->set_brightness(s, 1);                // Increase brightness (range -2 to 2)
  s->set_contrast(s, 1);                  // Slight increase in contrast
  s->set_saturation(s, 1);                // Slightly more saturated
  s->set_gainceiling(s, GAINCEILING_4X);  // Higher gain for better low-light performance
  s->set_exposure_ctrl(s, 1);             // Enable auto exposure
  s->set_ae_level(s, 1);                  // Slight positive exposure compensation (range -2 to 2)
  s->set_aec_value(s, 500);               // Higher exposure time (0-1200)
  
  // Short delay to let settings apply
  delay(200);
  
  // Try multiple times to get a good frame
  for (int attempt = 0; attempt < 5; attempt++) {  // Increased to 5 attempts
    if (millis() - startTime > CAPTURE_TIMEOUT) {
      break;
    }
    
    fb = esp_camera_fb_get();
    if (fb && fb->len > 1000) { // Make sure we have a meaningful image
      break;
    }
    
    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
    }
    
    Serial.printf("Capture attempt %d failed\n", attempt + 1);
    delay(300);  // Longer wait between attempts
  }
  
  // Check for valid frame
  if (!fb || fb->len < 1000) {
    if (fb) {
      esp_camera_fb_return(fb);
    }
    
    // Restore original settings before returning error
    s->set_framesize(s, orig_framesize);
    s->set_quality(s, orig_quality);
    s->set_brightness(s, orig_brightness);
    s->set_contrast(s, orig_contrast);
    s->set_saturation(s, orig_saturation);
    s->set_ae_level(s, orig_ae_level);
    s->set_aec_value(s, orig_aec_value);
    s->set_gainceiling(s, orig_gainceiling);
    
    httpd_resp_set_status(req, "500 Internal Server Error");
    httpd_resp_send(req, "Failed to capture valid image", HTTPD_RESP_USE_STRLEN);
    return ESP_FAIL;
  }
  
  // Set content type and send image data
  httpd_resp_set_type(req, "image/jpeg");
  
  Serial.printf("Sending %d bytes of image data\n", fb->len);
  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  
  // Free the frame buffer
  esp_camera_fb_return(fb);
  
  // Restore original settings
  s->set_framesize(s, orig_framesize);
  s->set_quality(s, orig_quality);
  s->set_brightness(s, orig_brightness);
  s->set_contrast(s, orig_contrast);
  s->set_saturation(s, orig_saturation);
  s->set_ae_level(s, orig_ae_level);
  s->set_aec_value(s, orig_aec_value);
  s->set_gainceiling(s, orig_gainceiling);
  
  return res;
}

static esp_err_t stop_stream_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type");
  
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    configure_camera_for_quality(s, true);
  }
  
  httpd_resp_send(req, "Stream stopped", HTTPD_RESP_USE_STRLEN);
  
  return ESP_OK;
}


static esp_err_t options_handler(httpd_req_t *req){
  // CORS headers đầy đủ cho OPTIONS requests
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Accept, Origin");
  httpd_resp_set_hdr(req, "Access-Control-Max-Age", "86400");
  httpd_resp_set_hdr(req, "Cross-Origin-Resource-Policy", "cross-origin");
  httpd_resp_set_hdr(req, "Cross-Origin-Embedder-Policy", "require-corp");
  httpd_resp_send(req, NULL, 0);
  return ESP_OK;
}

// Thêm handler cho CORS preflight riêng cho stream
static esp_err_t stream_options_handler(httpd_req_t *req){
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Accept, Origin");
  httpd_resp_set_hdr(req, "Access-Control-Max-Age", "86400");
  httpd_resp_set_hdr(req, "Cross-Origin-Resource-Policy", "cross-origin");
  httpd_resp_set_hdr(req, "Cross-Origin-Embedder-Policy", "require-corp");
  httpd_resp_send(req, NULL, 0);
  return ESP_OK;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.max_uri_handlers = 10;
  config.max_open_sockets = 5;  // Reduced for better stability
  config.stack_size = 8192;
  config.core_id = 0;  // Run HTTP server on core 0
  config.task_priority = 5;  // Higher priority
  config.lru_purge_enable = true;  // Enable LRU purging
  config.recv_wait_timeout = 12;  // 12 second receive timeout
  config.send_wait_timeout = 12;  // 12 second send timeout

  httpd_uri_t index_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };
  
  // OPTIONS handler riêng cho stream
  httpd_uri_t stream_options_uri = {
    .uri       = "/stream",
    .method    = HTTP_OPTIONS,
    .handler   = stream_options_handler,
    .user_ctx  = NULL
  };
  
  // OPTIONS handler chung
  httpd_uri_t options_uri = {
    .uri       = "/*",
    .method    = HTTP_OPTIONS,
    .handler   = options_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t stop_stream_uri = {
    .uri       = "/stopstream",
    .method    = HTTP_GET,
    .handler   = stop_stream_handler,
    .user_ctx  = NULL
  };
  
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &index_uri);
    httpd_register_uri_handler(stream_httpd, &capture_uri);
    httpd_register_uri_handler(stream_httpd, &stream_options_uri);
    httpd_register_uri_handler(stream_httpd, &options_uri);
    httpd_register_uri_handler(stream_httpd, &stop_stream_uri);
    Serial.println("HTTP server started successfully");
  } else {
    Serial.println("Failed to start HTTP server");
  }
}

void checkAndResetCamera() {
  // Try to get a frame - if it fails, reset the camera
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed in health check. Resetting camera...");
    
    // Reset the camera
    esp_camera_deinit();
    delay(100);
    esp_err_t err = esp_camera_init(&camera_config);
    
    if (err != ESP_OK) {
      Serial.printf("Camera re-init failed with error 0x%x\n", err);
    } else {
      Serial.println("Camera re-initialized successfully");
      sensor_t *s = esp_camera_sensor_get();
      configure_camera_for_quality(s, false);
    }
  } else {
    // Return the frame buffer
    esp_camera_fb_return(fb);
  }
  
  // Report memory status
  Serial.printf("Free heap: %d, PSRAM: %d\n", 
                ESP.getFreeHeap(), 
                ESP.getFreePsram());
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // disable brownout detector
  Serial.begin(115200);
  
  // Add warmup delay and initial messages
  for(uint8_t t = 4; t > 0; t--) {
    Serial.printf("[SETUP] WAIT %d...\n", t);
    Serial.flush();
    delay(500);
  }

  // Initialize camera configuration
  camera_config.ledc_channel = LEDC_CHANNEL_0;
  camera_config.ledc_timer = LEDC_TIMER_0;
  camera_config.pin_d0 = Y2_GPIO_NUM;
  camera_config.pin_d1 = Y3_GPIO_NUM;
  camera_config.pin_d2 = Y4_GPIO_NUM;
  camera_config.pin_d3 = Y5_GPIO_NUM;
  camera_config.pin_d4 = Y6_GPIO_NUM;
  camera_config.pin_d5 = Y7_GPIO_NUM;
  camera_config.pin_d6 = Y8_GPIO_NUM;
  camera_config.pin_d7 = Y9_GPIO_NUM;
  camera_config.pin_xclk = XCLK_GPIO_NUM;
  camera_config.pin_pclk = PCLK_GPIO_NUM;
  camera_config.pin_vsync = VSYNC_GPIO_NUM;
  camera_config.pin_href = HREF_GPIO_NUM;
  camera_config.pin_sccb_sda = SIOD_GPIO_NUM;
  camera_config.pin_sccb_scl = SIOC_GPIO_NUM;
  camera_config.pin_pwdn = PWDN_GPIO_NUM;
  camera_config.pin_reset = RESET_GPIO_NUM;
  camera_config.xclk_freq_hz = 20000000;
  camera_config.pixel_format = PIXFORMAT_JPEG;
  camera_config.grab_mode = CAMERA_GRAB_LATEST;  // Always get latest frame
  camera_config.fb_location = CAMERA_FB_IN_PSRAM;
  camera_config.jpeg_quality = 10;
  
  // Initialize camera with different settings based on PSRAM availability
  if(psramFound()){
    Serial.println("PSRAM found, using higher quality settings");
    camera_config.frame_size = FRAMESIZE_VGA;  // Start with VGA
    camera_config.jpeg_quality = 10;           // Good quality (0-63, lower is better)
    camera_config.fb_count = 2;                // Use 2 frame buffers
  } else {
    Serial.println("No PSRAM found, using lower quality settings");
    camera_config.frame_size = FRAMESIZE_QVGA; // Use QVGA
    camera_config.jpeg_quality = 12;           // Lower quality
    camera_config.fb_count = 1;                // Only 1 frame buffer
    camera_config.fb_location = CAMERA_FB_IN_DRAM;
  }

  // Initialize the camera
  esp_err_t err = esp_camera_init(&camera_config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    // Try to restart after a delay
    delay(1000);
    ESP.restart();
    return;
  }
  
  Serial.println("Camera initialized successfully");

  // Configure camera for streaming
  sensor_t * s = esp_camera_sensor_get();
  configure_camera_for_quality(s, false);

  // Connect to WiFi with improved connection logic
  WiFi.disconnect(true);
  delay(1000);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // Disable modem sleep for better response
  
  Serial.printf("Connecting to '%s' with password '%s'\n", ssid, password);
  WiFi.begin(ssid, password);
  
  // Wait for connection with timeout
  uint8_t connectionAttempts = 0;
  const uint8_t maxAttempts = 20;
  
  while (WiFi.status() != WL_CONNECTED && connectionAttempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    connectionAttempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("Subnet mask: ");
    Serial.println(WiFi.subnetMask());
    
    // Start the camera server
    startCameraServer();
    
    Serial.print("Camera Stream Ready! Go to: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed.");
    delay(1000);
    ESP.restart();
  }
}

void loop() {
  static unsigned long lastWifiCheck = 0;
  static unsigned long lastRebootCheck = 0;
  static unsigned long lastCameraCheck = 0;
  static unsigned long lastStatusReport = 0;
  static int failedWifiAttempts = 0;
  unsigned long currentMillis = millis();
  
  // Check WiFi connection every 3 seconds
  if (currentMillis - lastWifiCheck >= 3000) {
    lastWifiCheck = currentMillis;
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost. Reconnecting...");
      failedWifiAttempts++;
      
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(ssid, password);
      
      // Wait up to 5 seconds for reconnection
      unsigned long reconnectStart = millis();
      while (WiFi.status() != WL_CONNECTED && millis() - reconnectStart < 5000) {
        delay(300);
        Serial.print(".");
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi reconnected!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
        failedWifiAttempts = 0;
      }
    } else {
      failedWifiAttempts = 0;
    }
  }
  
  // Reboot if WiFi connection fails repeatedly
  if (currentMillis - lastRebootCheck >= 60000) { // Check every minute
    lastRebootCheck = currentMillis;
    
    if (failedWifiAttempts >= 10) {
      Serial.println("Too many failed WiFi connection attempts. Rebooting...");
      delay(1000);
      ESP.restart();
    }
  }
  
  // Check camera health every 2 minutes
  if (currentMillis - lastCameraCheck >= 120000) {
    lastCameraCheck = currentMillis;
    checkAndResetCamera();
  }
  
  // Print status every 5 minutes
  if (currentMillis - lastStatusReport >= 300000) {
    lastStatusReport = currentMillis;
    Serial.printf("Status Report - Free heap: %d, PSRAM: %d, WiFi: %d\n", 
                  ESP.getFreeHeap(), 
                  ESP.getFreePsram(),
                  WiFi.status());
  }
  
  // Yield to background tasks
  delay(100);
}