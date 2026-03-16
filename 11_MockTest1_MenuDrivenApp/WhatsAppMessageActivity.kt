package com.example.madlabexam.mock1

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.net.URLEncoder

class WhatsAppMessageActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_whatsapp_message)

        val etPhone = findViewById<EditText>(R.id.etPhone)
        val etMessage = findViewById<EditText>(R.id.etMessage)
        val btnSend = findViewById<Button>(R.id.btnSendWhatsApp)

        btnSend.setOnClickListener {
            val phone = etPhone.text.toString().trim()
            val message = etMessage.text.toString().trim()

            if (!phone.matches(Regex("^[0-9]{10}$"))) {
                etPhone.error = "Enter valid 10-digit mobile number"
                return@setOnClickListener
            }

            if (message.isEmpty()) {
                etMessage.error = "Message required"
                return@setOnClickListener
            }

            val wordCount = message.split(Regex("\\s+")).filter { it.isNotBlank() }.size
            if (wordCount > 200) {
                etMessage.error = "Message must be <= 200 words"
                return@setOnClickListener
            }

            val encoded = URLEncoder.encode(message, "UTF-8")
            val url = "https://wa.me/91$phone?text=$encoded"
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            try {
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "WhatsApp not installed", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
