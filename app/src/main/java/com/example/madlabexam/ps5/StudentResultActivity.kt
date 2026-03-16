package com.example.madlabexam.ps5

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class StudentResultActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_student_result)

        findViewById<TextView>(R.id.tvStudentData).text = intent.getStringExtra("student_data") ?: "No data"
    }
}
