export interface UserView {
  id: string;
  email: string;
  name: string;
  roles: string[];
  timezone: string;
  locale: string;
}

export interface SubjectSummary {
  id: string;
  slug: string;
  title: string;
  gsPaper: string;
  moduleCount: number;
  lessonCount: number;
}
