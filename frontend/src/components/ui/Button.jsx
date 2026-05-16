import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  onClick, 
  className = '', 
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200/50 hover:shadow-slate-200/80",
    secondary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200/50 hover:shadow-blue-200/80",
    outline: "bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200/50 hover:shadow-red-200/80",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200/50 hover:shadow-emerald-200/80",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={20} className={children ? "shrink-0" : ""} />}
      {children}
    </button>
  );
};

export default Button;
