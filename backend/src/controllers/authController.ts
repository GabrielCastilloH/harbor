import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';

interface SignupRequestBody {
  email: string;
  name: string;
  password: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

export const signup = async (req: Request<{}, {}, SignupRequestBody>, res: Response) => {
  const { email, name, password } = req.body;

  console.log('Signup request:', { email, name, password });

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, name, password: hashedPassword });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    console.log('User created:', user);

    res.status(201).json({ message: 'User created!', token });
  } catch (error) {
    console.error('Error in signup:', error); // Log the full error
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const login = async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
  const { email, password } = req.body;

  console.log('Login request:', { email, password });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'User not found!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    console.log('Login successful:', user);

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error in login:', error); // Log the full error
    res.status(500).json({ message: 'Something went wrong' });
  }
};
