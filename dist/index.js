"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequelizeTypescriptMigration = void 0;
const beautify = require("js-beautify");
const fs = require("fs");
const getTablesFromModels_1 = require("./utils/getTablesFromModels");
const getDiffActionsFromTables_1 = require("./utils/getDiffActionsFromTables");
const getMigration_1 = require("./utils/getMigration");
const createMigrationTable_1 = require("./utils/createMigrationTable");
const getLastMigrationState_1 = require("./utils/getLastMigrationState");
const writeMigration_1 = require("./utils/writeMigration");
class SequelizeTypescriptMigration {
}
exports.SequelizeTypescriptMigration = SequelizeTypescriptMigration;
SequelizeTypescriptMigration.makeMigration = async (sequelize, options) => {
    options.preview = options.preview || false;
    if (fs.existsSync(options.outDir) === false) {
        return Promise.reject({
            msg: `${options.outDir} not exists. check path and if you did 'npx sequelize init' you must use path used in sequelize migration path`,
        });
    }
    await sequelize.authenticate();
    const models = sequelize.models;
    const queryInterface = sequelize.getQueryInterface();
    await createMigrationTable_1.default(sequelize);
    const lastMigrationState = await getLastMigrationState_1.default(sequelize);
    const previousState = {
        revision: lastMigrationState !== undefined ? lastMigrationState["revision"] : 0,
        version: lastMigrationState !== undefined ? lastMigrationState["version"] : 1,
        tables: lastMigrationState !== undefined ? lastMigrationState["tables"] : {},
    };
    const currentState = {
        revision: previousState.revision + 1,
        tables: getTablesFromModels_1.default(sequelize, models),
    };
    const upActions = getDiffActionsFromTables_1.default(previousState.tables, currentState.tables);
    const downActions = getDiffActionsFromTables_1.default(currentState.tables, previousState.tables);
    const migration = getMigration_1.default(upActions);
    const tmp = getMigration_1.default(downActions);
    migration.commandsDown = tmp.commandsUp;
    if (migration.commandsUp.length === 0) {
        console.log("No changes found");
        process.exit(0);
    }
    migration.consoleOut.forEach(v => {
        console.log(`[Actions] ${v}`);
    });
    if (options.preview) {
        console.log("Migration result:");
        console.log(beautify(`[ \n${migration.commandsUp.join(", \n")} \n];\n`));
        console.log("Undo commands:");
        console.log(beautify(`[ \n${migration.commandsDown.join(", \n")} \n];\n`));
        return Promise.resolve({ msg: "success without save" });
    }
    const info = await writeMigration_1.default(currentState.revision, migration, options);
    console.log(`New migration to revision ${currentState.revision} has been saved to file '${info.filename}'`);
    const rows = [
        {
            revision: currentState.revision,
            name: info.info.name,
            state: JSON.stringify(currentState),
        },
    ];
    try {
        await queryInterface.bulkDelete("SequelizeMetaMigrations", {
            revision: currentState.revision,
        });
        await queryInterface.bulkInsert("SequelizeMetaMigrations", rows);
        console.log(`Use sequelize CLI:
  npx sequelize db:migrate --to ${info.revisionNumber}-${info.info.name}.js ${`--migrations-path=${options.outDir}`} `);
        return Promise.resolve({ msg: "success" });
    }
    catch (err) {
        if (options.debug)
            console.error(err);
    }
    return Promise.resolve({ msg: "success anyway.." });
};
//# sourceMappingURL=index.js.map