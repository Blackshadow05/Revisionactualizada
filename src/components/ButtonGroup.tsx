'use client';

import React from 'react';

interface ButtonGroupProps {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  required?: boolean;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({ label, options, selectedValue, onSelect, required = false }) => {
  return (
    <div className="space-y-3">
      <label className="block text-base font-medium text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`
              px-5 py-3 rounded-xl text-base font-semibold border transition-all duration-200
              ${selectedValue === option
                ? 'bg-gradient-to-br from-[#c9a45c] via-[#d4b06c] to-[#f0c987] text-[#1a1f35] border-transparent shadow-[0_8px_16px_rgb(0_0_0/0.2)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 after:absolute after:inset-0 after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 border border-[#f0c987]/20 hover:border-[#f0c987]/40'
                : 'bg-[#1e2538]/80 backdrop-blur-md text-gray-300 border-[#3d4659]/50 hover:bg-[#262f47]/90 hover:border-[#4a5573]/50 shadow-[0_4px_8px_rgb(0_0_0/0.2)] hover:shadow-[0_8px_16px_rgb(0_0_0/0.3)]'}
            `}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ButtonGroup; 