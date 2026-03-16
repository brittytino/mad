package com.example.madlabexam.ps4

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class PS4ResultActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ps4_result)

        val data = intent.getStringExtra("form_data") ?: "No data"
        findViewById<TextView>(R.id.tvPS4Data).text = data
    }
}
