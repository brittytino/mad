package com.example.madlabexam.mock1

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate

class MainMenuActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applySavedTheme()
        setContentView(R.layout.activity_menu_home)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.menu_whatsapp -> {
                startActivity(Intent(this, WhatsAppMessageActivity::class.java))
                true
            }

            R.id.menu_play_music -> {
                startService(Intent(this, MusicService::class.java))
                true
            }

            R.id.menu_theme_toggle -> {
                toggleTheme()
                true
            }

            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun toggleTheme() {
        val prefs = getSharedPreferences("mock_test_prefs", MODE_PRIVATE)
        val isDark = prefs.getBoolean("is_dark", false)
        val nextDark = !isDark
        prefs.edit().putBoolean("is_dark", nextDark).apply()

        AppCompatDelegate.setDefaultNightMode(
            if (nextDark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        )
        recreate()
    }

    private fun applySavedTheme() {
        val isDark = getSharedPreferences("mock_test_prefs", MODE_PRIVATE).getBoolean("is_dark", false)
        AppCompatDelegate.setDefaultNightMode(
            if (isDark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        )
    }
}
