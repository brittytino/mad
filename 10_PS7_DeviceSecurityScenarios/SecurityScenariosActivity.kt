package com.example.madlabexam.ps7

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.auth.api.phone.SmsRetriever

class SecurityScenariosActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_security_scenarios)

        val etOtp = findViewById<EditText>(R.id.etOtp)

        findViewById<Button>(R.id.btnStartOtpListen).setOnClickListener {
            // SMS Retriever API listens for OTP without SMS read permission.
            val task = SmsRetriever.getClient(this).startSmsRetriever()
            task.addOnSuccessListener {
                Toast.makeText(this, "OTP listener started", Toast.LENGTH_SHORT).show()
                // In real app, register a BroadcastReceiver and parse OTP from SMS message.
                // Example (demo): etOtp.setText(parsedOtp)
            }
            task.addOnFailureListener {
                Toast.makeText(this, "Failed to start OTP listener", Toast.LENGTH_SHORT).show()
            }
        }

        findViewById<Button>(R.id.btnInternetSettings).setOnClickListener {
            startActivity(Intent(Settings.ACTION_WIRELESS_SETTINGS))
        }

        findViewById<Button>(R.id.btnUsbDebuggingSettings).setOnClickListener {
            startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS))
        }

        findViewById<Button>(R.id.btnKeyboardSettings).setOnClickListener {
            startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        }

        findViewById<Button>(R.id.btnLocationSettings).setOnClickListener {
            startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
        }
    }
}
