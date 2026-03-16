package com.example.madlabexam.ps3

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class FeedbackResultActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_feedback_result)

        val message = intent.getStringExtra("feedback_message") ?: "No feedback"
        findViewById<TextView>(R.id.tvSubmittedMessage).text = message
    }
}
