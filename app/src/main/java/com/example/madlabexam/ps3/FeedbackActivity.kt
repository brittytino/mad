package com.example.madlabexam.ps3

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.RatingBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class FeedbackActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_feedback)

        val ratingBar = findViewById<RatingBar>(R.id.ratingBar)
        val tvRatingMessage = findViewById<TextView>(R.id.tvRatingMessage)
        val etFeedback = findViewById<EditText>(R.id.etFeedback)
        val btnSend = findViewById<Button>(R.id.btnSend)

        ratingBar.setOnRatingBarChangeListener { _, rating, _ ->
            tvRatingMessage.text = when (rating.toInt()) {
                5 -> "Awesome. I love it"
                4 -> "Good. Enjoyed it"
                3 -> "Satisfied."
                2 -> "Not good. Need improvement"
                1 -> "Disappointed. Very poor"
                else -> "Choose a rating"
            }
        }

        btnSend.setOnClickListener {
            val message = etFeedback.text.toString().trim()
            if (message.isEmpty()) {
                etFeedback.error = "Message is required"
                return@setOnClickListener
            }

            val intent = Intent(this, FeedbackResultActivity::class.java)
            intent.putExtra("feedback_message", message)
            startActivity(intent)
            Toast.makeText(this, "Feedback sent", Toast.LENGTH_SHORT).show()
        }
    }
}
