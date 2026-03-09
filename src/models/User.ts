import mongoose, { Schema, Document, Model } from 'mongoose';
import { Role } from '@/types/user';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
  position: string;
  status: string;
  phone: string;
  salary: number;
  joinedDate: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'HR_MANAGER', 'MARKETING_MANAGER', 'SALES_MANAGER', 'STOCK_MANAGER' , 'FINANCE_MANAGER' , 'PURCHASE_MANAGER' , 'COMMERCIAL_MANAGER' , 'EMPLOYEE'],
      default: 'EMPLOYEE',
    },
    department: {
      type: String,
      enum: ['HR', 'Marketing', 'Online Sales', 'None', 'Stock', 'Finance', 'Commercial', 'Purchase'],
      default: 'None',
    },
    position: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active',
    },
    phone: {
      type: String,
      default: '',
    },
    salary: {
      type: Number,
      default: 0,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;