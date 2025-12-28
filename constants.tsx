
import React from 'react';
import { 
  IdCard, 
  Car, 
  GraduationCap, 
  Landmark, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { DocCategory } from './types';

export const CATEGORY_ICONS: Record<DocCategory, React.ReactNode> = {
  [DocCategory.IDENTITY]: <IdCard className="w-5 h-5" />,
  [DocCategory.VEHICLE]: <Car className="w-5 h-5" />,
  [DocCategory.EDUCATION]: <GraduationCap className="w-5 h-5" />,
  [DocCategory.BANKING]: <Landmark className="w-5 h-5" />,
  [DocCategory.INSURANCE]: <ShieldCheck className="w-5 h-5" />,
  [DocCategory.OTHERS]: <FileText className="w-5 h-5" />,
};

export const CATEGORY_COLORS: Record<DocCategory, string> = {
  [DocCategory.IDENTITY]: 'bg-blue-100 text-blue-700 border-blue-200',
  [DocCategory.VEHICLE]: 'bg-orange-100 text-orange-700 border-orange-200',
  [DocCategory.EDUCATION]: 'bg-purple-100 text-purple-700 border-purple-200',
  [DocCategory.BANKING]: 'bg-green-100 text-green-700 border-green-200',
  [DocCategory.INSURANCE]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [DocCategory.OTHERS]: 'bg-gray-100 text-gray-700 border-gray-200',
};
