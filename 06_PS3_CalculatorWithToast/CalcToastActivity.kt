package com.example.madlabexam.ps3

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class CalcToastActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_calc_toast)

        val etA = findViewById<EditText>(R.id.etA)
        val etB = findViewById<EditText>(R.id.etB)
        val spOperation = findViewById<Spinner>(R.id.spOperation)
        val btnEqual = findViewById<Button>(R.id.btnEqual)

        val ops = listOf("+", "-", "*", "/")
        spOperation.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, ops)

        btnEqual.setOnClickListener {
            val a = etA.text.toString().toDoubleOrNull()
            val b = etB.text.toString().toDoubleOrNull()

            if (a == null || b == null) {
                Toast.makeText(this, "Enter valid numbers", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val result = when (spOperation.selectedItem.toString()) {
                "+" -> a + b
                "-" -> a - b
                "*" -> a * b
                "/" -> {
                    if (b == 0.0) {
                        Toast.makeText(this, "DivideByZero not allowed", Toast.LENGTH_SHORT).show()
                        return@setOnClickListener
                    }
                    a / b
                }
                else -> 0.0
            }

            Toast.makeText(this, "Answer: $result", Toast.LENGTH_SHORT).show()
        }
    }
}
