package com.example.madlabexam.ps5

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.util.Calendar

class StudentRegistrationActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_student_registration)

        val etName = findViewById<EditText>(R.id.etName)
        val etRollNo = findViewById<EditText>(R.id.etRollNo)
        val rgGender = findViewById<RadioGroup>(R.id.rgGender)
        val cbSports = findViewById<CheckBox>(R.id.cbSports)
        val cbMusic = findViewById<CheckBox>(R.id.cbMusic)
        val cbReading = findViewById<CheckBox>(R.id.cbReading)
        val spProgramme = findViewById<Spinner>(R.id.spProgramme)
        val etDob = findViewById<EditText>(R.id.etDob)
        val actvCity = findViewById<AutoCompleteTextView>(R.id.actvCity)
        val btnRegister = findViewById<Button>(R.id.btnRegister)

        val programmes = listOf("BCA", "BSc CS", "BTech IT", "MCA")
        spProgramme.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, programmes)

        val cities = listOf("Bengaluru", "Mysuru", "Chennai", "Hyderabad", "Mumbai")
        actvCity.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, cities))

        etDob.setOnClickListener {
            val cal = Calendar.getInstance()
            DatePickerDialog(this, { _, year, month, day ->
                etDob.setText("$day/${month + 1}/$year")
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        btnRegister.setOnClickListener {
            val name = etName.text.toString().trim()
            val roll = etRollNo.text.toString().trim()
            val city = actvCity.text.toString().trim()
            val dob = etDob.text.toString().trim()

            if (name.isEmpty()) {
                etName.error = "Name required"
                return@setOnClickListener
            }

            if (roll.isEmpty()) {
                etRollNo.error = "Roll no required"
                return@setOnClickListener
            }

            if (rgGender.checkedRadioButtonId == -1) {
                Toast.makeText(this, "Select gender", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val hobbies = mutableListOf<String>()
            if (cbSports.isChecked) hobbies.add("Sports")
            if (cbMusic.isChecked) hobbies.add("Music")
            if (cbReading.isChecked) hobbies.add("Reading")
            if (hobbies.isEmpty()) {
                Toast.makeText(this, "Select at least one hobby", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (dob.isEmpty()) {
                etDob.error = "Select DOB"
                return@setOnClickListener
            }

            if (city.isEmpty()) {
                actvCity.error = "City required"
                return@setOnClickListener
            }

            val gender = findViewById<android.widget.RadioButton>(rgGender.checkedRadioButtonId).text.toString()

            val data = """
                Name: $name
                Roll No: $roll
                Gender: $gender
                Hobbies: ${hobbies.joinToString()}
                Programme: ${spProgramme.selectedItem}
                DOB: $dob
                City: $city
            """.trimIndent()

            val intent = Intent(this, StudentResultActivity::class.java)
            intent.putExtra("student_data", data)
            startActivity(intent)
        }
    }
}
