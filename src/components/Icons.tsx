import React from 'react';
import {
  Brush,
  Sparkles,
  Bath,
  Utensils,
  Trash2,
  Coffee,
  ShoppingCart,
  Shirt,
  CheckCircle2,
  Clock,
  Car,
  Calendar,
  Settings,
  User,
  Shield,
  Home,
  Plus,
  AlertTriangle,
  RotateCw,
  Zap,
  Info,
  CalendarClock,
  MapPin,
  Check,
  ChevronRight,
  ListTodo,
  TrendingUp,
  Sliders,
  ExternalLink,
  Edit2,
  Trash,
  ArrowRight,
  Sparkle,
  X,
  ChevronLeft,
  ChevronDown,
  Globe,
  RefreshCw,
  Link,
  Unlink,
  CalendarRange,
  Database,
  Table,
  FileSpreadsheet,
  Layers,
  Key,
  Tag,
  FolderPlus,
  Users,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  FlaskConical,
  UserPlus,
  Lock,
  Unlock,
} from 'lucide-react';

export const TaskIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'brush':
      return <Brush className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'bath':
      return <Bath className={className} />;
    case 'utensils':
      return <Utensils className={className} />;
    case 'trash-2':
    case 'trash':
      return <Trash2 className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'shopping-cart':
      return <ShoppingCart className={className} />;
    case 'shirt':
      return <Shirt className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'car':
      return <Car className={className} />;
    default:
      return <ListTodo className={className} />;
  }
};

export {
  Brush,
  Sparkles,
  Bath,
  Utensils,
  Trash2,
  Coffee,
  ShoppingCart,
  Shirt,
  CheckCircle2,
  Clock,
  Car,
  Calendar,
  Settings,
  User,
  Shield,
  Home,
  Plus,
  AlertTriangle,
  RotateCw,
  Zap,
  Info,
  CalendarClock,
  MapPin,
  Check,
  ChevronRight,
  ListTodo,
  TrendingUp,
  Sliders,
  ExternalLink,
  Edit2,
  Trash,
  ArrowRight,
  Sparkle,
  X,
  ChevronLeft,
  ChevronDown,
  Globe,
  RefreshCw,
  Link,
  Unlink,
  CalendarRange,
  Database,
  Table,
  FileSpreadsheet,
  Layers,
  Key,
  Tag,
  FolderPlus,
  Users,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  FlaskConical,
  UserPlus,
  Lock,
  Unlock,
};
