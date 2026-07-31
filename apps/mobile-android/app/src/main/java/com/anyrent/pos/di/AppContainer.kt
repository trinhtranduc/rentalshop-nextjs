package com.anyrent.pos.di

import com.anyrent.pos.data.repository.DefaultAvailabilityRepository
import com.anyrent.pos.domain.availability.AvailabilityRepository
import com.anyrent.pos.data.repository.DefaultPaymentRepository
import com.anyrent.pos.domain.payment.PaymentRepository

class AppContainer {
    val availabilityRepository: AvailabilityRepository by lazy {
        DefaultAvailabilityRepository()
    }

    val paymentRepository: PaymentRepository by lazy {
        DefaultPaymentRepository()
    }
}
