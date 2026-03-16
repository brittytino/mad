package com.example.madlabexam.ps4

import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ListView
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class PS4FormActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ps4_form)

        val etPatientName = findViewById<EditText>(R.id.etPatientName)
        val spDepartment = findViewById<Spinner>(R.id.spDepartment)
        val lvSymptoms = findViewById<ListView>(R.id.lvSymptoms)
        val btnSubmit = findViewById<Button>(R.id.btnSubmit)

        val departments = listOf("General Medicine", "Cardiology", "Neurology", "Orthopedics")
        val symptoms = listOf("Fever", "Headache", "Chest Pain", "Body Pain", "Fatigue")

        spDepartment.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, departments)
        lvSymptoms.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_multiple_choice, symptoms)

        btnSubmit.setOnClickListener {
            val name = etPatientName.text.toString().trim()
            if (name.isEmpty()) {
                etPatientName.error = "Name is required"
                return@setOnClickListener
            }

            val selectedSymptoms = mutableListOf<String>()
            for (i in symptoms.indices) {
                if (lvSymptoms.isItemChecked(i)) {
                    selectedSymptoms.add(symptoms[i])
                }
            }

            if (selectedSymptoms.isEmpty()) {
                Toast.makeText(this, "Select at least one symptom", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val summary = """
                Name: $name
                Department: ${spDepartment.selectedItem}
                Symptoms: ${selectedSymptoms.joinToString()}
            """.trimIndent()

            val intent = Intent(this, PS4ResultActivity::class.java)
            intent.putExtra("form_data", summary)
            startActivity(intent)
        }
    }
}
