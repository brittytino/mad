package com.example.madlabexam

import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.ListView
import androidx.appcompat.app.AppCompatActivity
import com.example.madlabexam.exercise1.ConverterActivity
import com.example.madlabexam.exercise2.CookieActivity
import com.example.madlabexam.mock1.MainMenuActivity
import com.example.madlabexam.ps2.BasicCalculatorActivity
import com.example.madlabexam.ps2.VisitingCardActivity
import com.example.madlabexam.ps3.CalcToastActivity
import com.example.madlabexam.ps3.FeedbackActivity
import com.example.madlabexam.ps4.PS4FormActivity
import com.example.madlabexam.ps5.StudentRegistrationActivity
import com.example.madlabexam.ps6.HospitalDirectoryActivity
import com.example.madlabexam.ps7.SecurityScenariosActivity

class HomeActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        val listView = findViewById<ListView>(R.id.lvModules)

        val items = listOf(
            "Exercise 1 - Converter",
            "Exercise 2 - Hungry Cookie",
            "PS2 Program 1 - Visiting Card",
            "PS2 Program 2 - Basic Calculator",
            "PS3 - Feedback App",
            "PS3 - Calculator With Toast",
            "PS4 - Form + Validation + Intent",
            "PS5 - Student Registration",
            "PS6 - Hospital Doctor Directory",
            "PS7 - Device Security Scenarios",
            "Mock Test 1 - Menu Driven App"
        )

        listView.adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, items)

        listView.setOnItemClickListener { _, _, position, _ ->
            val target = when (position) {
                0 -> ConverterActivity::class.java
                1 -> CookieActivity::class.java
                2 -> VisitingCardActivity::class.java
                3 -> BasicCalculatorActivity::class.java
                4 -> FeedbackActivity::class.java
                5 -> CalcToastActivity::class.java
                6 -> PS4FormActivity::class.java
                7 -> StudentRegistrationActivity::class.java
                8 -> HospitalDirectoryActivity::class.java
                9 -> SecurityScenariosActivity::class.java
                10 -> MainMenuActivity::class.java
                else -> ConverterActivity::class.java
            }
            startActivity(Intent(this, target))
        }
    }
}
