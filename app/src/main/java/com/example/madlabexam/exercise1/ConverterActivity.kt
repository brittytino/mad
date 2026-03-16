package com.example.madlabexam.exercise1

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class ConverterActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_converter)

        val etInput = findViewById<EditText>(R.id.etInput)
        val spConversion = findViewById<Spinner>(R.id.spConversion)
        val btnConvert = findViewById<Button>(R.id.btnConvert)
        val tvResult = findViewById<TextView>(R.id.tvResult)

        val options = listOf("Celsius to Fahrenheit", "Fahrenheit to Celsius")
        spConversion.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, options)

        btnConvert.setOnClickListener {
            val value = etInput.text.toString().toDoubleOrNull()
            if (value == null) {
                etInput.error = "Enter a valid number"
                return@setOnClickListener
            }

            val resultText = if (spConversion.selectedItemPosition == 0) {
                val out = (value * 9 / 5) + 32
                "Fahrenheit: %.2f".format(out)
            } else {
                val out = (value - 32) * 5 / 9
                "Celsius: %.2f".format(out)
            }

            tvResult.text = resultText
            Toast.makeText(this, resultText, Toast.LENGTH_SHORT).show()
        }
    }
}
