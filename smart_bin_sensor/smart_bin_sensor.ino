const int TRIG_PIN = 5;
const int ECHO_PIN = 6;

const float BIN_HEIGHT = 30.0;  // Bin height in cm

void setup() {
    Serial.begin(9600);

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
}

void loop() {

    // Send ultrasonic pulse
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);

    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);

    digitalWrite(TRIG_PIN, LOW);

    // Measure echo time
    long duration = pulseIn(ECHO_PIN, HIGH);

    // Calculate distance
    float distance = duration * 0.0343 / 2;

    // Calculate waste level
    float wasteLevel = ((BIN_HEIGHT - distance) / BIN_HEIGHT) * 100;

    // Keep value between 0 and 100
    if (wasteLevel < 0) {
        wasteLevel = 0;
    }

    if (wasteLevel > 100) {
        wasteLevel = 100;
    }

    // Send data to SerialPort → COM8 → COM9 → Node.js
    Serial.print("Waste Level: ");
    Serial.print(wasteLevel);
    Serial.println("%");

    delay(1000);
}