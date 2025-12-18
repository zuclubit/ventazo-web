/**
 * Onboarding Components
 *
 * Centralized exports for all onboarding-related components.
 * @module components/onboarding
 */

// Layout components
export {
  OnboardingLayout,
  StepCard,
  FormSection,
  OptionCard,
  ModuleToggle,
} from './onboarding-layout';

// Stepper components
export {
  OnboardingStepper,
  StepperProgressBar,
  MobileStepper,
  STEPPER_STEPS,
  getStepIndex,
  getStepConfig,
  isStepVisible,
  calculateProgress,
  type StepConfig,
  type OnboardingStepperProps,
} from './onboarding-stepper';

// Logo upload component
export { LogoUpload } from './logo-upload';

// Advanced color picker
export {
  AdvancedColorPicker,
  CompactColorPicker,
} from './advanced-color-picker';

// Theme preview components
export {
  ThemePreview,
  CompactThemePreview,
} from './theme-preview';
