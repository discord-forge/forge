/**
 * Constant message strings used by the bot to provide feedback.
 */
enum BotMessages {
    SETUP_INVALID = "Missing or invalid settings options",
    SETUP_FAIL_LOAD_FRAGMENTS = "Failed to load internal fragments",
    SETUP_NO_FRAGMENTS_DETECTED = "No internal fragments were detected",
    SETUP_NO_FRAGMENTS_LOADED = "No internal fragments were loaded",
    SETUP_NO_FRAGMENTS_ENABLED = "No internal fragments were enabled",
    SETUP_NO_SERVICES_LOADED = "No services were loaded",
    SETUP_NO_COMMANDS_LOADED = "No commands were loaded",
    SETUP_NO_COMMANDS_ENABLED = "No commands were enabled",
    SETUP_LOADING_TASKS = "Loading tasks",
    SETUP_NO_TASKS_TRIGGERED = "No tasks were triggered",
    SETUP_NO_TASKS_FOUND = "No tasks found",
    SETUP_START_OPTIMIZER = "Starting optimization engine",
    SETUP_STARTED_OPTIMIZER = "Started optimization engine",
    SETUP_COMPLETED = "Bot setup completed",

    CONTEXT_EXPECT_TEXT_CHANNEL = "Expecting message's channel to be a text channel",

    LANG_NO_DEFAULT = "No language source has been set as default",
    LANG_NO_BASE_DIR = "No base directory has been specified",
    LANG_BASE_DIR_NO_EXIST = "Base directory no longer exists",

    CFG_EXPECT_GENERAL = "Expecting general settings",
    CFG_FILE_NO_EXIST = "Could not load settings: File does not exist",

    CMD_PARSE_FAIL = "Failed parsing command | Command is null",

    UNDO_NO_ACTIONS = "You haven't performed any undoable action",
    UNDO_OK = "The action was successfully undone",
    UNDO_FAIL = "The action failed to be undone",

    INTENTIONAL_ERROR = "Intentionally thrown error",
    NOT_IMPLEMENTED = "Not yet implemented"
}

export default BotMessages;
