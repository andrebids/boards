import fs from 'fs';
import path from 'path';

const readSource = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('dashboard module isolation', () => {
  it('keeps the dashboard workspace out of the eager Boards module graph', () => {
    const staticSource = readSource('../common/Static/Static.jsx');

    expect(staticSource).not.toMatch(
      /^import DashboardWorkspace from '..\/..\/project-dashboard\/DashboardWorkspace';$/m,
    );
    expect(staticSource).toMatch(
      /const DashboardWorkspace = React\.lazy\(\(\) =>\s*import\('\.\.\/\.\.\/project-dashboard\/DashboardWorkspace'\)\s*\);/m,
    );
    expect(staticSource).toContain('<ErrorBoundary fallback={DashboardErrorFallback}>');
  });

  it('does not link newly added dashboard helpers as named ESM imports', () => {
    const dashboardWorkspaceSource = readSource('./DashboardWorkspace.jsx');

    expect(dashboardWorkspaceSource).toMatch(/^import \* as \w+ from '.\/dashboardLayout';$/m);
  });

  it('uses one explicit GridStack drag handle for every dashboard widget in the editor', () => {
    const dashboardWorkspaceSource = readSource('./DashboardWorkspace.jsx');

    expect(dashboardWorkspaceSource).toMatch(
      /isEditor && \(\s*<div aria-hidden="true" className={styles\.dragHandle}>/,
    );
    expect(dashboardWorkspaceSource).toMatch(
      /draggable: \{ handle: `\.\$\{styles\.dragHandle\}` \},/,
    );
  });

  it('defers the Gantt widget until it enters the viewport', () => {
    const widgetContentSource = readSource('./widgets/DashboardWidgetContent.jsx');

    expect(widgetContentSource).toContain("import { useInView } from 'react-intersection-observer';");
    expect(widgetContentSource).toMatch(/useInView\(\{ triggerOnce: true \}\)/);
    expect(widgetContentSource).toContain('<DeferredDashboardGanttWidget');
  });
});
