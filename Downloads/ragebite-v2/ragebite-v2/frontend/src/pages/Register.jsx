import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import InputField from '../components/auth/InputField';
import PasswordStrength from '../components/auth/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = 'https://ragebite-production.up.railway.app/api';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_RE  = /^[a-zA-Z0-9_]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [fields, setFields] = useState({ username:'', email:'', password:'', confirmPassword:'' });
  const [errors,
