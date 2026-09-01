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

    expect(widgetContentSource).toContain(
      "import { useInView } from 'react-intersection-observer';",
    );
    expect(widgetContentSource).toMatch(/useInView\(\{ triggerOnce: true \}\)/);
    expect(widgetContentSource).toContain('<DeferredDashboardGanttWidget');
  });

  it('rotates the Gantt with a configured task list and clears its timer', () => {
    const ganttSource = readSource('./widgets/DashboardGanttWidget.jsx');
    const widgetContentSource = readSource('./widgets/DashboardWidgetContent.jsx');

    expect(widgetContentSource).toContain('cardId={widget.config.cardId}');
    expect(widgetContentSource).toContain('rotationSeconds={widget.config.rotationSeconds}');
    expect(widgetContentSource).toContain('taskListId={widget.config.taskListId}');
    expect(ganttSource).toContain('window.setInterval');
    expect(ganttSource).toContain('window.clearInterval');
    expect(ganttSource).toContain('<DashboardTaskListPanel');
  });

  it('sizes the rotating task list from its widget container', () => {
    const panelSource = readSource('./widgets/DashboardTaskListPanel.jsx');
    const styles = readSource('./widgets/DashboardTaskListPanel.module.scss');

    expect(panelSource).toContain('ResizeObserver');
    expect(panelSource).toContain("window.addEventListener('resize', updateLayout)");
    expect(panelSource).toContain("window.removeEventListener('resize', updateLayout)");
    expect(panelSource).toContain("'--task-list-columns'");
    expect(panelSource).toContain("'--task-list-rows'");
    expect(styles).toContain('container-type: inline-size');
    expect(styles).toContain('@container');
    expect(styles).toContain('grid-auto-flow: column');
    expect(styles).not.toContain('overflow: auto');
    expect(styles).not.toContain('@media');
  });

  it('uses the native Planka card task list visual contract', () => {
    const panelSource = readSource('./widgets/DashboardTaskListPanel.jsx');
    const styles = readSource('./widgets/DashboardTaskListPanel.module.scss');

    expect(panelSource).toContain('name="check square outline"');
    expect(panelSource).toContain("import UserAvatar from '../../users/UserAvatar';");
    expect(panelSource).toContain('id={task.assigneeUserId}');
    expect(styles).toContain('--card-modal-background: var(--app-dark-canvas);');
    expect(styles).toContain('background: var(--card-modal-background);');
    expect(styles).toContain('.assigneeUserAvatar');
    expect(styles).toContain('border-radius: 5px;');
    expect(styles).toContain('height: 16px;');
    expect(styles).not.toContain('color-mix(in oklab, var(--app-dark-border) 65%, transparent)');
  });

  it('sizes the Codex usage layout from the widget container instead of the viewport', () => {
    const styles = readSource('./widgets/DashboardCodexUsageWidget.module.scss');

    expect(styles).toContain('@container (min-width: 900px)');
    expect(styles).not.toContain('@media (min-width: 900px)');
  });

  it('always stacks Codex usage above token activity', () => {
    const styles = readSource('./widgets/DashboardCodexUsageWidget.module.scss');

    expect(styles.match(/\.weekly\s*\{/g)).toHaveLength(1);
    expect(styles).toMatch(/\.weekly\s*\{[^}]*display: flex;[^}]*flex-direction: column;/s);
  });
});
