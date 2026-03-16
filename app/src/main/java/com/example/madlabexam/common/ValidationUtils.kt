package com.example.madlabexam.common

object ValidationUtils {

    fun isTextEmpty(value: String): Boolean {
        return value.trim().isEmpty()
    }

    fun isValidPhone(value: String): Boolean {
        return value.matches(Regex("^[6-9][0-9]{9}$"))
    }

    fun isValidEmail(value: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(value).matches()
    }

    fun isNonZero(value: Double): Boolean {
        return value != 0.0
    }
}
