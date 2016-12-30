/* 
 *  CONTROLLER 002 
 *  
 *  By Steven de Salas
 *  
 *  Example of radio control positive/negative feedback 
 *  on auto-discovery microcontroller.
 *  
 *  Uses a protocol to allow USB querying of available 
 *  output (actuator) commands, and examples of the same,
 *  so the upstream microprocessor can act upon them.
 *  
 */
#include "Queue.h";
#include "VirtualWire.h"

FILE serial_stdout;
String command;
struct Tone { long due; int pitch; int duration; };
struct Flash { long due; byte onOff; int duration; };
Queue<Tone> tones = Queue<Tone>(32);
Queue<Flash> reds = Queue<Flash>(32);
Queue<Flash> greens = Queue<Flash>(32);
int currentPitch;
char delimiter_out = '>';
char delimiter_in = '<';
char delimiter_break = '|';

// Inputs
int LIGHT = A5;
int RF_RX = 2;
int RF_LED = 3;

// Outputs
int LED_G = 7;
int LED_R = 4;
int BUZ = 9;

void setup() {
  pinMode(RF_LED, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_R, OUTPUT);
  pinMode(BUZ, OUTPUT);
  Serial.begin(115200);
  // Set up stdout
  fdev_setup_stream(&serial_stdout, serial_putchar, NULL, _FDEV_SETUP_WRITE);
  stdout = &serial_stdout;
  // Set up radio receiver
  vw_set_rx_pin(RF_RX); 
  vw_setup(2000); // Transmission speed in bits per second.
  vw_rx_start(); // Start the PLL receiver.
  delay(1);
}

void loop() {
  listen();
  interpret();
  act();
  sense();
  delay(500);
}

// Reads 1 line from USB Serial
void listen() {
  // Read line
  char chr;
  command = ""; 
  while(Serial && Serial.available()) {
      chr = Serial.read();
      if (chr == 10) break; // exit on new line
      else command.concat(chr);
  }
  //command.trim();
}

void interpret() {
  // Process latest command
  int command_length = command.length();
  if (command_length < 1) return;
  Serial.print(command);
  randomSeed(micros());
  short pos; byte batch; int value; byte duration;
  long due; // When is the command due? used to process batches.
  Flash switch_off; Tone go_quiet;
  switch(command[0]) {

    case '?':
      //
      // Help - List Available commands
      //
      if (command_length < 3) {
        Serial.print(delimiter_in);
        Serial.println("B|R|G");
        return;
      };

      // Provide examples
      switch(command[2]) {

        case 'B':
          //
          // Buzzer Example
          //
          batch = random(1, 5); 
          Serial.print(delimiter_out);
          for (int i = 0; i < batch; i++) {
            if (i > 0) { Serial.print(delimiter_break); }
            Serial.write(b2c64(random(0, 63))); //--> base64 tone (part 1)
            Serial.write(b2c64(random(0, 63))); //--> base64 tone (part 2)
            Serial.write(b2c64(randomLHS(0, 63))); //--> base64 duration
          }
          Serial.println();
          return;

        case 'R':
        case 'G': 
          // 
          // Red/Green LED Example
          //
          batch = randomLHS(1, 5); // 1-5 (left-leaning distribution)
          Serial.print(delimiter_out);
          for (int i = 0; i < batch; i++) {
            if (i > 0) { Serial.print(delimiter_break); }
            Serial.write(random(48, 50)); // '0' or '1' --> on/off
            Serial.write(b2c64(random(0, 63))); //--> base64 duration
          }
          Serial.println(); 
          return;
      }
      return;

    case 'B':
      // 
      // Buzzer HAL
      // 
      // See example: note that `tone` 0-4095 (hertz with left-leaning mod). `duration` is 0-63 x64 milliseconds (ie max 4sec)
      //
      // "B>ux4|aB0" // ie. B>[byte `tone`][byte `tone`][byte `duration`]|[byte `tone`][byte `tone`][byte `duration`]|...
      //
      if (command_length < 4) return;
      tones.clear();
      due = millis();
      pos = 2;
      while(pos+1 < command_length) {
        value = (c2b64(command[pos++]) << 6) | c2b64(command[pos++]); // tone byte 1 + byte 2
        duration = command_length == pos ? 63 : c2b64(command[pos++]); // Max if undefined
        Tone segment = { due, n2tone(value), duration * 64};
        tones.push(segment);
        due = due + segment.duration;
        pos++; // skip separator (|)
      }
      go_quiet = { due, 0, 1 };
      tones.push(go_quiet);
      Serial.println();
      //Serial.println("--OK");
      return;

    case 'R':
    case 'G':
      // 
      // Red/Green LED HAL
      //
      // See example: note that `duration` is 0-63 x64 milliseconds (ie max 4sec)
      //
      // "R>1y|0G|1n" // ie. R>[0/1][byte duration]|[0/1][byte duration]|...
      //
      if (command_length < 3) return;
      ((command[0] == 'G') ? greens : reds).clear();
      due = millis();
      pos = 2;
      while(pos < command_length) {
        value = command[pos++] != 48;
        duration = command_length == pos ? 63 : c2b64(command[pos++]); // Max if undefined
        Flash flash = { due, value, duration * 64};
        ((command[0] == 'G') ? greens : reds).push(flash);
        due = due + flash.duration;
        pos++; // skip separator (|)
      }
      switch_off = { due, 0, 0 };
      ((command[0] == 'G') ? greens : reds).push(switch_off); // Turn off when finished
      //Serial.println("--OK");
      Serial.println();
      return;
    default:
      Serial.println("--ERR");
      return;
  }
}

void act() {
  if (tones.count()) {
    Tone delayedtone = tones.peek();
    if (delayedtone.due < millis()) { // Is it due?
      delayedtone = tones.pop();
      //printf("Acting on delay, %d items left", tones.count());
      //Serial.println();
      tone(BUZ, delayedtone.pitch, delayedtone.duration);
      currentPitch = delayedtone.pitch;
    }
  }

  if (greens.count()) {
    Flash flash = greens.peek();
    if (flash.due < millis()) {
      flash = greens.pop();
      //printf("Acting on delay, %d items left", greens.count());
      //Serial.println();
      digitalWrite(LED_G, flash.onOff);
    }
  }

  if (reds.count()) {
    Flash flash = reds.peek();
    if (flash.due < millis()) {
      flash = reds.pop();
      //printf("Acting on delay, %d items left", reds.count());
      //Serial.println();
      digitalWrite(LED_R, flash.onOff);
    }
  }
}

void sense() {
  // Light Sensor
  Serial.print('G'); 
  Serial.print(delimiter_out);
  Serial.println(digitalRead(LED_G));
  Serial.print('L');
  Serial.print(delimiter_out);
  Serial.println(map(analogRead(LIGHT), 0, 1023, 0, 15));
  Serial.print('R');
  Serial.print(delimiter_out);
  Serial.println(digitalRead(LED_R));
  Serial.print('B');
  Serial.print(delimiter_out);
  Serial.println(currentPitch);
  Serial.print('W');
  Serial.print(delimiter_out);
  Serial.println(getRFMessage());
}

String getRFMessage() {

  // Initialize data
  uint8_t buf[VW_MAX_MESSAGE_LEN];
  uint8_t buflen = VW_MAX_MESSAGE_LEN;
  String output = "";

  // Read incoming messages
  if(vw_get_message(buf, &buflen))
  {
    // Message with a good checksum received, dump HEX
    for(int i = 0; i < buflen; ++i)
    {
      output.concat(char(buf[i]));
    }
  }

  if (output.length() > 0) {
    digitalWrite(RF_LED, HIGH);
  } else {
    digitalWrite(RF_LED, LOW);
  }
  
  return output;
}

// Convert number to tone
// biases output towards lower herz ranges (ie voice)
int n2tone(int n) { return floor(pow(constrain(n, 0, 4095) / 64.0, 2)); }
//int n2tone(int n) { return (n < 1024) n : 1024 + (n - 1024) * pow(n/1024.0, 1.2); }

// Base64 encoding/decoding
String base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
byte c2b64(char chr) { return constrain(base64.indexOf(chr), 0, 63); }
char b2c64(byte num) { return base64[constrain(num, 0, 63)]; }

// Left-side leaning random number
int randomLHS(int from, int to) { 
    return floor((pow(random(0, ((to - from) * 10) + 1) / 10.0, 1.6) / to) + from);
}

// Function that printf and related will use to print
int serial_putchar(char c, FILE* f) {
    if (c == '\n') serial_putchar('\r', f);
    return Serial.write(c) == 1? 0 : 1;
}
