package com.example.madlabexam.ps6

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class HospitalDirectoryActivity : AppCompatActivity() {

    private val callPermissionCode = 101
    private var selectedPhone: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_hospital_directory)

        val etSearch = findViewById<EditText>(R.id.etSearch)
        val lvDoctors = findViewById<ListView>(R.id.lvDoctors)

        val doctors = listOf(
            Doctor("Dr. Raj", "Cardiology", "9876543210"),
            Doctor("Dr. Priya", "Neurology", "9865443322"),
            Doctor("Dr. Imran", "Orthopedics", "9123456780"),
            Doctor("Dr. Meera", "Pediatrics", "9001122334"),
            Doctor("Dr. Ajay", "Emergency", "9988776655")
        )

        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, doctors.toMutableList())
        lvDoctors.adapter = adapter

        etSearch.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: android.text.Editable?) {
                val query = s.toString().trim().lowercase()
                val filtered = doctors.filter {
                    it.name.lowercase().contains(query) || it.department.lowercase().contains(query)
                }
                adapter.clear()
                adapter.addAll(filtered)
                adapter.notifyDataSetChanged()
            }
        })

        lvDoctors.setOnItemClickListener { _, _, position, _ ->
            val doctor = adapter.getItem(position) ?: return@setOnItemClickListener
            selectedPhone = doctor.phone
            placeCallWithPermissionCheck(doctor.phone)
        }
    }

    private fun placeCallWithPermissionCheck(phone: String) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:$phone")))
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CALL_PHONE), callPermissionCode)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == callPermissionCode && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            selectedPhone?.let { placeCallWithPermissionCheck(it) }
        } else {
            Toast.makeText(this, "Call permission denied", Toast.LENGTH_SHORT).show()
        }
    }
}
