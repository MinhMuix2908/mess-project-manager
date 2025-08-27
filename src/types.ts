export interface ProjectNode {
  label: string;
  path: string;
  children?: ProjectNode[];
}

export interface ProjectCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}
