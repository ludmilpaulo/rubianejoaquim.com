'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function RubianeImage() {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
        <div className="text-center p-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary-300 flex items-center justify-center">
            <svg className="w-16 h-16 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">Rubiane Joaquim</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Image
        src="/images/Rubiane.jpeg"
        alt="Rubiane Joaquim — Especialista em Educação Financeira. Cursos e mentoria para todos os países e pessoas de língua portuguesa."
        fill
        className="object-cover object-center"
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={() => setImageError(true)}
        unoptimized={false}
      />
      {/* Fallback placeholder que aparece enquanto carrega ou se houver erro */}
      {imageError && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
          <div className="text-center p-8">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary-300 flex items-center justify-center">
              <svg className="w-16 h-16 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Rubiane Joaquim</p>
          </div>
        </div>
      )}
    </>
  )
}
