package com.example.madlabexam.ps6

data class Doctor(
    val name: String,
    val department: String,
    val phone: String
) {
    override fun toString(): String {
        return "$name - $department ($phone)"
    }
}
