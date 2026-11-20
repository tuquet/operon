export interface RegisteredMicroApp {
  id: string;
  name: string;
  version: string;
  devPort: number;
  defaultPath: string;
  icon: string;
  titleKey: string;
  order: number;
}

export interface AppRegistryManifest {
  version: string;
  generatedAt: string;
  apps: Record<string, RegisteredMicroApp>;
}

export const APP_REGISTRY: Record<string, RegisteredMicroApp> = {
  automation: {
    id: 'automation',
    name: 'Automation Mesh',
    version: '0.1.0',
    devPort: 5321,
    defaultPath: 'overview',
    icon: 'lucide:workflow',
    titleKey: 'page.automation.title',
    order: 20,
  },
  system: {
    id: 'system',
    name: 'System & Hardware Mesh',
    version: '0.1.0',
    devPort: 5322,
    defaultPath: 'overview',
    icon: 'lucide:shield-check',
    titleKey: 'page.system.title',
    order: 30,
  },
  tenants: {
    id: 'tenants',
    name: 'Multi-Tenant Hub',
    version: '0.1.0',
    devPort: 5323,
    defaultPath: 'overview',
    icon: 'lucide:building-2',
    titleKey: 'page.tenants.title',
    order: 40,
  },
  playground: {
    id: 'playground',
    name: 'Playground',
    version: '0.1.0',
    devPort: 5324,
    defaultPath: 'overview',
    icon: 'lucide:layers',
    titleKey: 'page.playground.title',
    order: 50,
  },
};

export function getRegisteredApp(id: string): RegisteredMicroApp | undefined {
  return APP_REGISTRY[id];
}
