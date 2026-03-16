package com.example.madlabexam.ps2

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class BasicCalculatorActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_basic_calculator)

        val etNum1 = findViewById<EditText>(R.id.etNum1)
        val etNum2 = findViewById<EditText>(R.id.etNum2)
        val tvAnswer = findViewById<TextView>(R.id.tvAnswer)

        fun readInput(): Pair<Double, Double>? {
            val n1 = etNum1.text.toString().toDoubleOrNull()
            val n2 = etNum2.text.toString().toDoubleOrNull()
            if (n1 == null || n2 == null) {
                Toast.makeText(this, "Enter valid numbers", Toast.LENGTH_SHORT).show()
                return null
            }
            return Pair(n1, n2)
        }

        findViewById<Button>(R.id.btnAdd).setOnClickListener {
            val pair = readInput() ?: return@setOnClickListener
            tvAnswer.text = "Answer: ${pair.first + pair.second}"
        }

        findViewById<Button>(R.id.btnSub).setOnClickListener {
            val pair = readInput() ?: return@setOnClickListener
            tvAnswer.text = "Answer: ${pair.first - pair.second}"
        }

        findViewById<Button>(R.id.btnMul).setOnClickListener {
            val pair = readInput() ?: return@setOnClickListener
            tvAnswer.text = "Answer: ${pair.first * pair.second}"
        }

        findViewById<Button>(R.id.btnDiv).setOnClickListener {
            val pair = readInput() ?: return@setOnClickListener
            if (pair.second == 0.0) {
                Toast.makeText(this, "Cannot divide by zero", Toast.LENGTH_SHORT).show()
            } else {
                tvAnswer.text = "Answer: ${pair.first / pair.second}"
            }
        }
    }
}
