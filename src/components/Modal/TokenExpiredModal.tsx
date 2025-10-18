'use client';

import React from 'react';

interface TokenExpiredModalProps {
    onContinue: () => void;
    onExit: () => void;
    isLoading?: boolean;
}

export default function TokenExpiredModal({ onContinue, onExit, isLoading = false }: TokenExpiredModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
                <h2 className="text-xl font-bold mb-4">Sesión expirada</h2>
                <p className="mb-6">
                    Tu sesión ha expirado. ¿Deseas iniciar sesión nuevamente o salir de la aplicación?
                </p>

                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onExit}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded ${isLoading ? 'bg-gray-200 text-gray-400' : 'bg-gray-300 hover:bg-gray-400'}`}
                    >
                        Salir
                    </button>

                    <button
                        onClick={onContinue}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded text-white ${isLoading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                Reanudando...
                            </span>
                        ) : (
                            'Continuar'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
