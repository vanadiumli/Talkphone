export interface AppConfig {
  id: string
  name: string
  icon: string
  color?: string
  component?: React.ComponentType
}

export interface WidgetConfig {
  id: string
  size: 'large' | 'medium'
  component: React.ComponentType
  label?: string
}
