const GRID_COLUMNS = 12;

const WIDGETS = {
  progress: { minW: 3, minH: 3, maxW: 12, maxH: 10 },
  status: { minW: 3, minH: 3, maxW: 12, maxH: 5 },
  upcoming: { minW: 2, minH: 3, maxW: 12, maxH: 10 },
  attention: { minW: 4, minH: 3, maxW: 12, maxH: 10 },
  gantt: { minW: 6, minH: 5, maxW: 12, maxH: 12 },
  blachereProducts: { minW: 3, minH: 4, maxW: 12, maxH: 10 },
  blachereStatic: { minW: 3, minH: 4, maxW: 12, maxH: 10 },
  blachereAnimated: { minW: 3, minH: 4, maxW: 12, maxH: 10 },
  codexUsage: { minW: 4, minH: 4, maxW: 12, maxH: 10 },
  factorialEntrance: { minW: 2, minH: 2, maxW: 2, maxH: 2 },
};

const GANTT_ZOOM_LEVELS = new Set(["day", "week", "month", "quarter"]);
const GANTT_ROTATION_MIN_SECONDS = 5;
const GANTT_ROTATION_MAX_SECONDS = 300;
const BLACHERE_WIDGET_TYPES = new Set([
  "blachereProducts",
  "blachereStatic",
  "blachereAnimated",
]);
const HIDDEN_WIDGET_TYPES = new Set(["blachereProducts"]);
const TASK_STATE_COLUMNS = ["twoD", "threeD"];

const normalizeBlachereTaskConfig = (config) => {
  if (config === undefined) {
    return undefined;
  }

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Blachere dashboard widget configuration is invalid");
  }

  if (config.taskStates === undefined) {
    return undefined;
  }

  if (
    !config.taskStates ||
    typeof config.taskStates !== "object" ||
    Array.isArray(config.taskStates)
  ) {
    throw new Error("Blachere dashboard widget task states are invalid");
  }

  const taskStates = Object.entries(config.taskStates).reduce(
    (result, [taskId, state]) => {
      if (!state || typeof state !== "object" || Array.isArray(state)) {
        throw new Error("Blachere dashboard widget task state is invalid");
      }

      const normalizedState = TASK_STATE_COLUMNS.reduce((nextState, column) => {
        if (state[column] === undefined) {
          return nextState;
        }

        if (!["done", "pending"].includes(state[column])) {
          throw new Error(
            "Blachere dashboard widget has an invalid task state",
          );
        }

        return { ...nextState, [column]: state[column] };
      }, {});

      return Object.keys(normalizedState).length > 0
        ? { ...result, [taskId]: normalizedState }
        : result;
    },
    {},
  );

  return Object.keys(taskStates).length > 0 ? { taskStates } : undefined;
};

const normalizeWidgetConfig = (type, config) => {
  if (BLACHERE_WIDGET_TYPES.has(type)) {
    return normalizeBlachereTaskConfig(config);
  }

  if (type !== "gantt") {
    return undefined;
  }

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Gantt dashboard widget must have a configuration");
  }

  if (typeof config.projectId !== "string" || config.projectId.trim() === "") {
    throw new Error("Gantt dashboard widget must reference a project");
  }

  if (!GANTT_ZOOM_LEVELS.has(config.zoomLevel)) {
    throw new Error("Gantt dashboard widget has an invalid zoom level");
  }

  const normalizedConfig = {
    projectId: config.projectId,
    zoomLevel: config.zoomLevel,
  };

  const hasRotationConfig =
    config.cardId !== undefined ||
    config.taskListId !== undefined ||
    config.rotationSeconds !== undefined;

  if (!hasRotationConfig) {
    return normalizedConfig;
  }

  if (
    typeof config.cardId !== "string" ||
    config.cardId.trim() === "" ||
    typeof config.taskListId !== "string" ||
    config.taskListId.trim() === "" ||
    !Number.isInteger(config.rotationSeconds) ||
    config.rotationSeconds < GANTT_ROTATION_MIN_SECONDS ||
    config.rotationSeconds > GANTT_ROTATION_MAX_SECONDS
  ) {
    throw new Error("Gantt dashboard widget has an invalid rotation configuration");
  }

  return {
    ...normalizedConfig,
    cardId: config.cardId,
    taskListId: config.taskListId,
    rotationSeconds: config.rotationSeconds,
  };
};

const normalizeDashboardLayout = (layout) => {
  if (!Array.isArray(layout)) {
    throw new Error("Dashboard layout must be an array");
  }

  const ids = new Set();
  const visibleLayout = layout.filter((item) => !HIDDEN_WIDGET_TYPES.has(item.type));

  return visibleLayout.map((item) => {
    const widget = WIDGETS[item.type];

    if (!widget) {
      throw new Error("Unknown dashboard widget");
    }

    if (ids.has(item.id)) {
      throw new Error("Dashboard widget ids must be unique");
    }

    ids.add(item.id);

    const config = normalizeWidgetConfig(item.type, item.config);
    const normalizedItem = {
      id: String(item.id),
      type: item.type,
      x: Number(item.x),
      y: Number(item.y),
      w: Number(item.w),
      h: Number(item.h),
    };

    if (config) {
      normalizedItem.config = config;
    }

    if (
      !Number.isInteger(normalizedItem.x) ||
      !Number.isInteger(normalizedItem.y) ||
      !Number.isInteger(normalizedItem.w) ||
      !Number.isInteger(normalizedItem.h) ||
      normalizedItem.x < 0 ||
      normalizedItem.y < 0 ||
      normalizedItem.w < widget.minW ||
      normalizedItem.w > widget.maxW ||
      normalizedItem.h < widget.minH ||
      normalizedItem.h > widget.maxH ||
      normalizedItem.x + normalizedItem.w > GRID_COLUMNS
    ) {
      throw new Error("Dashboard widget is outside the dashboard grid");
    }

    return normalizedItem;
  });
};

module.exports = { normalizeDashboardLayout };
