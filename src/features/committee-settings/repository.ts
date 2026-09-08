import {
  createDraftIdForSchoolYear,
  createBasicDraftConfiguration,
  DUT_CRITERIA_CONFIGURATION_SEED,
} from "./dut-seed.ts";
import {
  getCriteriaInFixedOrder,
  hasExactlyFiveCoreCriteria,
  summarizeConfiguration,
} from "./criteria-model.ts";
import {
  CriteriaConfigurationNotFoundError,
  DuplicateDraftSchoolYearError,
  type CreateDraftInput,
  type CriteriaConfiguration,
  type CriteriaConfigurationStatus,
  type CriteriaRepository,
  type CriteriaRepositoryRecoveryState,
  type CriterionConfiguration,
  type OtherEvidenceGroup,
} from "./types.ts";

export const LOCAL_CRITERIA_STORAGE_KEY = "5tot:committee:dut:criteria-configuration:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class LocalCriteriaRepository implements CriteriaRepository {
  private recoveredFromInvalidStorage = false;
  private memoryConfigurations: CriteriaConfiguration[] | null = null;
  private readonly storageKey: string;
  private readonly getStorage: () => StorageLike | null;

  constructor(storageKey = LOCAL_CRITERIA_STORAGE_KEY, getStorage = defaultStorage) {
    this.storageKey = storageKey;
    this.getStorage = getStorage;
  }

  async list() {
    return this.readAll()
      .map((configuration) => summarizeConfiguration(configuration))
      .sort(compareConfigurations);
  }

  async get(id: string) {
    const configuration = this.readAll().find((item) => item.id === id);
    if (!configuration) throw new CriteriaConfigurationNotFoundError();
    return clone(configuration);
  }

  async createDraft(input: CreateDraftInput) {
    const configurations = this.readAll();
    this.assertNoDraftForSchoolYear(configurations, input.schoolYear);
    const configuration = createBasicDraftConfiguration(
      createDraftIdForSchoolYear(input.schoolYear),
      input.schoolYear,
    );
    this.writeAll([...configurations, configuration]);
    return clone(configuration);
  }

  async cloneAsDraft(sourceConfigurationId: string, targetSchoolYear: string) {
    const configurations = this.readAll();
    this.assertNoDraftForSchoolYear(configurations, targetSchoolYear);
    const source = configurations.find((item) => item.id === sourceConfigurationId);
    if (!source) throw new CriteriaConfigurationNotFoundError();

    const configuration = cloneWithNewIds(
      source,
      createDraftIdForSchoolYear(targetSchoolYear),
      targetSchoolYear,
    );
    this.writeAll([...configurations, configuration]);
    return clone(configuration);
  }

  async save(configuration: CriteriaConfiguration) {
    const configurations = this.readAll();
    const index = configurations.findIndex((item) => item.id === configuration.id);
    if (index < 0) throw new CriteriaConfigurationNotFoundError();
    if (configurations[index].status !== "draft" || configuration.status !== "draft") {
      throw new Error("Only draft criteria configurations can be edited");
    }
    if (!isValidConfiguration(configuration)) {
      throw new Error("Invalid criteria configuration");
    }

    const next = [...configurations];
    next[index] = clone(configuration);
    this.writeAll(next);
    return clone(configuration);
  }

  async publish(configurationId: string) {
    return this.changeStatus(configurationId, "published");
  }

  async archive(configurationId: string) {
    const configurations = this.readAll();
    const target = configurations.find((item) => item.id === configurationId);
    if (!target) throw new CriteriaConfigurationNotFoundError();
    const publishedCount = configurations.filter((item) => item.status === "published").length;
    if (target.status === "published" && publishedCount <= 1) {
      throw new Error("Cannot archive the only applied criteria configuration");
    }
    return this.changeStatus(configurationId, "archived");
  }

  async resetDemo() {
    this.writeAll(seedConfigurations());
    this.recoveredFromInvalidStorage = false;
  }

  consumeRecoveryState(): CriteriaRepositoryRecoveryState {
    const state = { recoveredFromInvalidStorage: this.recoveredFromInvalidStorage };
    this.recoveredFromInvalidStorage = false;
    return state;
  }

  private changeStatus(
    configurationId: string,
    status: CriteriaConfigurationStatus,
  ): CriteriaConfiguration {
    const configurations = this.readAll();
    const index = configurations.findIndex((item) => item.id === configurationId);
    if (index < 0) throw new CriteriaConfigurationNotFoundError();
    const configuration = { ...configurations[index], status };
    const next = [...configurations];
    next[index] = configuration;
    this.writeAll(next);
    return clone(configuration);
  }

  private assertNoDraftForSchoolYear(configurations: CriteriaConfiguration[], schoolYear: string) {
    const existingDraft = configurations.find(
      (item) => item.schoolYear === schoolYear && item.status === "draft",
    );
    if (existingDraft) {
      throw new DuplicateDraftSchoolYearError(schoolYear, existingDraft.id);
    }
  }

  private readAll() {
    if (this.memoryConfigurations) return clone(this.memoryConfigurations);
    const storage = this.getStorage();
    if (!storage) return seedConfigurations();

    const raw = storage.getItem(this.storageKey);
    if (!raw) {
      const seed = seedConfigurations();
      this.tryWriteSeed(seed);
      return seed;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isValidConfiguration)) {
        throw new Error("Stored criteria configurations are incompatible");
      }
      return clone(parsed).sort(compareConfigurations);
    } catch {
      const seed = seedConfigurations();
      this.recoveredFromInvalidStorage = true;
      this.tryWriteSeed(seed);
      return seed;
    }
  }

  private tryWriteSeed(configurations: CriteriaConfiguration[]) {
    try {
      this.writeAll(configurations);
    } catch {
      this.memoryConfigurations = clone(configurations);
    }
  }

  private writeAll(configurations: CriteriaConfiguration[]) {
    const storage = this.getStorage();
    if (!storage) {
      this.memoryConfigurations = clone(configurations);
      return;
    }
    try {
      storage.setItem(this.storageKey, JSON.stringify(configurations));
      this.memoryConfigurations = null;
    } catch {
      this.memoryConfigurations = clone(configurations);
      throw new Error("Unable to save criteria configuration locally");
    }
  }
}

export const localCriteriaRepository = new LocalCriteriaRepository();

export function seedConfigurations() {
  return clone(DUT_CRITERIA_CONFIGURATION_SEED);
}

export function isValidConfiguration(value: unknown): value is CriteriaConfiguration {
  if (!value || typeof value !== "object") return false;
  const candidate = value as CriteriaConfiguration;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.schoolYear !== "string" ||
    !["draft", "published", "archived"].includes(candidate.status) ||
    !candidate.criteria ||
    typeof candidate.criteria !== "object" ||
    !Array.isArray(candidate.otherEvidenceGroups)
  ) {
    return false;
  }
  if (!hasExactlyFiveCoreCriteria(candidate)) return false;
  if (!getCriteriaInFixedOrder(candidate).every(isValidCriterion)) return false;
  return candidate.otherEvidenceGroups.every(isValidOtherEvidenceGroup);
}

function isValidCriterion(value: unknown): value is CriterionConfiguration {
  if (!value || typeof value !== "object") return false;
  const candidate = value as CriterionConfiguration;
  return (
    typeof candidate.key === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.shortLabel === "string" &&
    Array.isArray(candidate.ruleGroups) &&
    candidate.ruleGroups.every(
      (group) =>
        group &&
        typeof group.id === "string" &&
        typeof group.title === "string" &&
        ["all", "any", "minimum"].includes(group.logic) &&
        Array.isArray(group.rules),
    )
  );
}

function isValidOtherEvidenceGroup(value: unknown): value is OtherEvidenceGroup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as OtherEvidenceGroup;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    ["priority", "reference", "unclassified", "manual_review"].includes(candidate.purpose) &&
    Array.isArray(candidate.relatedCriteria) &&
    Array.isArray(candidate.evidenceTypes)
  );
}

function cloneWithNewIds(
  source: CriteriaConfiguration,
  id: string,
  schoolYear: string,
): CriteriaConfiguration {
  const configuration = clone(source);
  const suffix = createDraftSuffix(schoolYear);
  return {
    ...configuration,
    id,
    schoolYear,
    status: "draft",
    criteria: Object.fromEntries(
      Object.entries(configuration.criteria).map(([criterionKey, criterion]) => [
        criterionKey,
        {
          ...criterion,
          ruleGroups: criterion.ruleGroups.map((group, groupIndex) => ({
            ...group,
            id: `${group.id}-${suffix}-g${groupIndex + 1}`,
            rules: group.rules.map((rule, ruleIndex) => ({
              ...rule,
              id: `${rule.id}-${suffix}-r${ruleIndex + 1}`,
            })),
          })),
        },
      ]),
    ) as CriteriaConfiguration["criteria"],
    otherEvidenceGroups: configuration.otherEvidenceGroups.map((group, groupIndex) => ({
      ...group,
      id: `${group.id}-${suffix}-og${groupIndex + 1}`,
      evidenceTypes: group.evidenceTypes.map((evidence, evidenceIndex) => ({
        ...evidence,
        id: `${evidence.id}-${suffix}-oe${evidenceIndex + 1}`,
      })),
    })),
  };
}

function createDraftSuffix(schoolYear: string) {
  return schoolYear
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9a-zA-Z]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function compareConfigurations(
  left: { schoolYear: string; status: CriteriaConfigurationStatus },
  right: { schoolYear: string; status: CriteriaConfigurationStatus },
) {
  const statusRank: Record<CriteriaConfigurationStatus, number> = {
    published: 0,
    draft: 1,
    archived: 2,
  };
  return (
    statusRank[left.status] - statusRank[right.status] ||
    right.schoolYear.localeCompare(left.schoolYear)
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
