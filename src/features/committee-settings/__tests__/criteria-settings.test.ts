import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CORE_CRITERION_KEYS, type CriteriaConfiguration } from "../types.ts";
import {
  getCriteriaInFixedOrder,
  hasExactlyFiveCoreCriteria,
  summarizeConfiguration,
} from "../criteria-model.ts";
import { DUT_CRITERIA_CONFIGURATION_SEED } from "../dut-seed.ts";
import { LocalCriteriaRepository, LOCAL_CRITERIA_STORAGE_KEY } from "../repository.ts";
import {
  createOtherEvidence,
  createRule,
  createRuleGroup,
  deleteOtherEvidence,
  deleteRule,
  deleteRuleGroup,
  duplicateOtherEvidence,
  duplicateRule,
  duplicateRuleGroup,
  getConfigurationEditorIssues,
  getCriterionStateLabel,
  getOtherEvidenceCount,
  getRuleSentence,
  hasMalformedOtherEvidence,
  moveOtherEvidencePurpose,
  moveRule,
  moveRuleGroup,
  moveRuleToGroup,
  normalizeEditorSection,
  OTHER_SECTION_KEY,
  RULE_TYPE_LABELS,
  RULE_TYPE_ORDER,
  updateOtherEvidence,
  updateRule,
  updateRuleGroup,
  type OtherEvidenceInput,
  type RuleInput,
} from "../editor-model.ts";
import {
  getBlockingValidationIssues,
  getWarningValidationIssues,
  validateCriteriaConfiguration,
} from "../validation.ts";

const read = (path: string) => readFileSync(path, "utf8");

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class FailingStorage extends MemoryStorage {
  override setItem(key: string, value: string) {
    super.setItem(key, value);
    throw new Error("storage unavailable");
  }
}

describe("committee criteria business model", () => {
  it("stores exactly five fixed core criteria and keeps Khác separate", () => {
    assert.equal(CORE_CRITERION_KEYS.length, 5);
    assert.deepEqual(CORE_CRITERION_KEYS, [
      "ethics",
      "academic",
      "physical",
      "volunteer",
      "integration",
    ]);

    for (const configuration of DUT_CRITERIA_CONFIGURATION_SEED) {
      assert.equal(hasExactlyFiveCoreCriteria(configuration), true);
      assert.equal(getCriteriaInFixedOrder(configuration).length, 5);
      assert.equal(summarizeConfiguration(configuration).coreCriteriaCount, 5);
      assert.equal(Array.isArray(configuration.otherEvidenceGroups), true);
      assert.equal(Object.prototype.hasOwnProperty.call(configuration.criteria, "other"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(configuration.criteria, "priority"), false);
    }
  });

  it("does not expose an action to add a sixth core criterion in phase 1", () => {
    const overview = read(
      "src/features/committee-settings/components/CriteriaSettingsOverviewPage.tsx",
    );
    const editor = read(
      "src/features/committee-settings/components/CriteriaConfigurationEditorPage.tsx",
    );

    assert.doesNotMatch(`${overview}${editor}`, /Thêm tiêu chí|addCriterion|sixth|6\/6/i);
    assert.match(editor, /Khác/);
    assert.match(editor, /không tính là tiêu chí thứ sáu/);
  });

  it("renders the requested published, draft and history sections without technical metadata", () => {
    const overview = read(
      "src/features/committee-settings/components/CriteriaSettingsOverviewPage.tsx",
    );
    const draft = DUT_CRITERIA_CONFIGURATION_SEED.find((item) => item.status === "draft")!;
    const validationMessages = validateCriteriaConfiguration(draft).map((issue) => issue.message);

    assert.match(overview, /Đang áp dụng/);
    assert.match(overview, /Đang chuẩn bị/);
    assert.match(overview, /Lịch sử các năm trước/);
    assert.equal(
      validationMessages.some((message) => message.includes("giá trị tối thiểu")),
      true,
    );
    assert.equal(
      validationMessages.some((message) => message.includes("không có điều kiện")),
      true,
    );
    assert.doesNotMatch(
      overview,
      /workspaceId|schoolId|DHBK-DHDN|usage count|application count|UUID|localStorage/,
    );
  });
});

describe("committee criteria repository lifecycle", () => {
  it("creates drafts, blocks duplicate draft years and preserves the published source", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);

    const publishedBefore = await repository.get("criteria-dut-2025-2026-published");
    const draft = await repository.cloneAsDraft("criteria-dut-2025-2026-published", "2028–2029");

    assert.equal(draft.status, "draft");
    assert.equal(draft.schoolYear, "2028–2029");
    assert.equal(hasExactlyFiveCoreCriteria(draft), true);
    assert.deepEqual(await repository.get("criteria-dut-2025-2026-published"), publishedBefore);
    await assert.rejects(
      () => repository.createDraft({ schoolYear: "2028–2029" }),
      /Draft already exists/,
    );
  });

  it("persists saved edits across repository reloads", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);
    const draft = await repository.createDraft({ schoolYear: "2030–2031" });
    const edited: CriteriaConfiguration = {
      ...draft,
      criteria: {
        ...draft.criteria,
        ethics: {
          ...draft.criteria.ethics,
          description: "Ghi chú nội bộ đã lưu",
        },
      },
    };

    await repository.save(edited);

    const reloaded = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);
    const persisted = await reloaded.get(draft.id);
    assert.equal(persisted.criteria.ethics.description, "Ghi chú nội bộ đã lưu");
  });

  it("restores seed data from malformed localStorage and supports reset", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_CRITERIA_STORAGE_KEY, "{not-json");
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);

    const restored = await repository.list();
    assert.equal(restored.length, 3);
    assert.equal(repository.consumeRecoveryState().recoveredFromInvalidStorage, true);

    await repository.createDraft({ schoolYear: "2031–2032" });
    assert.equal((await repository.list()).length, 4);
    await repository.resetDemo();
    assert.equal((await repository.list()).length, 3);
  });

  it("does not make HTTP requests from the feature repository", () => {
    const repository = read("src/features/committee-settings/repository.ts");
    const hooks = read("src/features/committee-settings/hooks.ts");
    const overview = read(
      "src/features/committee-settings/components/CriteriaSettingsOverviewPage.tsx",
    );
    const editor = read(
      "src/features/committee-settings/components/CriteriaConfigurationEditorPage.tsx",
    );

    assert.doesNotMatch(
      `${repository}${hooks}${overview}${editor}`,
      /\bfetch\s*\(|apiClient|\/api\//,
    );
  });
});

describe("committee settings navigation and routes", () => {
  it("adds committee-only navigation without changing student, officer or manager menus", () => {
    const sidebar = read("src/components/layout/Sidebar.tsx");

    assert.match(sidebar, /const COMMITTEE_NAV/);
    assert.match(sidebar, /backendRole === "committee"\) return COMMITTEE_NAV/);
    assert.match(sidebar, /label: "Cấu hình", to: "\/app\/committee\/settings"/);
    assert.match(sidebar, /NAV\.manager\.map/);
    assert.doesNotMatch(
      sidebar.slice(sidebar.indexOf("student:"), sidebar.indexOf("officer:")),
      /\/app\/committee\/settings|label: "Cấu hình"/,
    );
    assert.doesNotMatch(
      sidebar.slice(sidebar.indexOf("officer:"), sidebar.indexOf("manager:")),
      /\/app\/committee\/settings|label: "Cấu hình"/,
    );
  });

  it("keeps the committee item active on overview and editor route paths", () => {
    const sidebar = read("src/components/layout/Sidebar.tsx");
    const overviewRoute = read("src/routes/app.committee.settings.tsx");
    const editorRoute = read("src/routes/app.committee.settings.criteria.$configurationId.tsx");
    const routeTree = read("src/routeTree.gen.ts");

    assert.match(sidebar, /normalizedPath\.startsWith\(`\$\{item\.to\}\/`\)/);
    assert.match(overviewRoute, /createFileRoute\("\/app\/committee\/settings"\)/);
    assert.match(
      editorRoute,
      /createFileRoute\("\/app\/committee\/settings\/criteria\/\$configurationId"\)/,
    );
    assert.match(routeTree, /\/app\/committee\/settings\/criteria\/\$configurationId/);
  });

  it("preserves existing committee links", () => {
    const sidebar = read("src/components/layout/Sidebar.tsx");

    assert.match(sidebar, /to: "\/app\/manager\/results"/);
    assert.match(sidebar, /to: "\/app\/assignment"/);
    assert.match(sidebar, /to: "\/app\/resolution"/);
    assert.match(sidebar, /to: "\/app\/export"/);
    assert.match(sidebar, /to: "\/app\/audit"/);
  });
});

describe("committee criteria editor model", () => {
  it("normalizes query-state sections to the five criteria plus Khác", () => {
    const route = read("src/routes/app.committee.settings.criteria.$configurationId.tsx");

    assert.equal(normalizeEditorSection("academic"), "academic");
    assert.equal(normalizeEditorSection("other"), OTHER_SECTION_KEY);
    assert.equal(normalizeEditorSection("unexpected"), "ethics");
    assert.match(route, /validateSearch/);
    assert.match(route, /section/);
  });

  it("supports group create, edit, duplicate, reorder and delete without changing fixed criteria", () => {
    let configuration = blankDraft("2032-2033");

    configuration = createRuleGroup(configuration, "ethics", {
      title: "Nhóm bắt buộc",
      logic: "all",
    });
    configuration = createRuleGroup(configuration, "ethics", {
      title: "Nhóm bổ sung",
      logic: "minimum",
      minimumRequired: 1,
    });

    assert.equal(configuration.criteria.ethics.ruleGroups.length, 2);
    assert.equal(hasExactlyFiveCoreCriteria(configuration), true);

    const firstGroup = configuration.criteria.ethics.ruleGroups[0];
    configuration = updateRuleGroup(configuration, "ethics", firstGroup.id, {
      title: "Nhóm đã sửa",
      logic: "any",
    });
    assert.equal(configuration.criteria.ethics.ruleGroups[0].title, "Nhóm đã sửa");
    assert.equal(configuration.criteria.ethics.ruleGroups[0].logic, "any");

    configuration = duplicateRuleGroup(configuration, "ethics", firstGroup.id);
    assert.equal(configuration.criteria.ethics.ruleGroups.length, 3);
    assert.match(configuration.criteria.ethics.ruleGroups[1].title, /bản sao/);

    configuration = moveRuleGroup(
      configuration,
      "ethics",
      configuration.criteria.ethics.ruleGroups[1].id,
      "down",
    );
    assert.match(configuration.criteria.ethics.ruleGroups[2].title, /bản sao/);

    configuration = deleteRuleGroup(
      configuration,
      "ethics",
      configuration.criteria.ethics.ruleGroups[2].id,
    );
    assert.equal(configuration.criteria.ethics.ruleGroups.length, 2);
  });

  it("supports all rule types plus edit, duplicate, reorder, move and delete", () => {
    let configuration = blankDraft("2033-2034");
    configuration = createRuleGroup(configuration, "academic", { title: "Nhóm 1", logic: "all" });
    configuration = createRuleGroup(configuration, "academic", { title: "Nhóm 2", logic: "any" });
    const [sourceGroup, targetGroup] = configuration.criteria.academic.ruleGroups;

    for (const input of allRuleTypeInputs()) {
      configuration = createRule(configuration, "academic", sourceGroup.id, input);
    }

    const rules = configuration.criteria.academic.ruleGroups[0].rules;
    assert.equal(rules.length, RULE_TYPE_ORDER.length);
    assert.deepEqual(
      rules.map((rule) => rule.type),
      RULE_TYPE_ORDER,
    );
    for (const rule of rules) {
      assert.equal(getRuleSentence(rule).length > 10, true);
      assert.match(RULE_TYPE_LABELS[rule.type], /\S/);
    }

    const firstRule = rules[0];
    configuration = updateRule(configuration, "academic", sourceGroup.id, firstRule.id, {
      ...allRuleTypeInputs()[0],
      label: "GPA từ 3.2 trở lên",
      value: 3.2,
    });
    assert.equal(
      configuration.criteria.academic.ruleGroups[0].rules[0].label,
      "GPA từ 3.2 trở lên",
    );

    configuration = duplicateRule(configuration, "academic", sourceGroup.id, firstRule.id);
    assert.match(configuration.criteria.academic.ruleGroups[0].rules[1].label, /bản sao/);

    configuration = moveRule(configuration, "academic", sourceGroup.id, firstRule.id, "down");
    assert.equal(configuration.criteria.academic.ruleGroups[0].rules[1].id, firstRule.id);

    configuration = moveRuleToGroup(
      configuration,
      "academic",
      sourceGroup.id,
      targetGroup.id,
      firstRule.id,
    );
    assert.equal(
      configuration.criteria.academic.ruleGroups[1].rules.some((rule) => rule.id === firstRule.id),
      true,
    );

    configuration = deleteRule(configuration, "academic", targetGroup.id, firstRule.id);
    assert.equal(
      configuration.criteria.academic.ruleGroups[1].rules.some((rule) => rule.id === firstRule.id),
      false,
    );
  });

  it("keeps empty and incomplete groups saveable but flags them before publish", () => {
    let configuration = blankDraft("2034-2035");
    configuration = createRuleGroup(configuration, "integration", {
      title: "Nhóm đang soạn",
      logic: "minimum",
      minimumRequired: 2,
    });

    assert.equal(getCriterionStateLabel(configuration.criteria.integration), "Cần hoàn thiện");
    assert.match(getConfigurationEditorIssues(configuration).join("\n"), /Nhóm đang soạn/);

    const groupId = configuration.criteria.integration.ruleGroups[0].id;
    configuration = createRule(configuration, "integration", groupId, {
      label: "Ngoại ngữ phù hợp",
      type: "enum_match",
      acceptedValues: ["A2"],
    });
    assert.match(getConfigurationEditorIssues(configuration).join("\n"), /số điều kiện tối thiểu/);
  });

  it("supports Khác create, edit, duplicate, move and delete without becoming a sixth criterion", () => {
    let configuration = blankDraft("2035-2036");
    const input: OtherEvidenceInput = {
      label: "Sản phẩm sáng tạo",
      description: "Dùng để Hội đồng tham khảo",
      purpose: "reference",
      relatedCriteria: ["academic", "integration"],
    };

    configuration = createOtherEvidence(configuration, input);
    assert.equal(hasExactlyFiveCoreCriteria(configuration), true);
    assert.equal(Object.prototype.hasOwnProperty.call(configuration.criteria, "other"), false);
    const countAfterCreate = getOtherEvidenceCount(configuration);
    const evidenceId = configuration.otherEvidenceGroups
      .flatMap((group) => group.evidenceTypes)
      .find((evidence) => evidence.label === input.label)!.id;

    configuration = updateOtherEvidence(configuration, evidenceId, {
      ...input,
      label: "Sản phẩm sáng tạo đã sửa",
      purpose: "priority",
    });
    assert.equal(
      configuration.otherEvidenceGroups.some((group) =>
        group.evidenceTypes.some((evidence) => evidence.label === "Sản phẩm sáng tạo đã sửa"),
      ),
      true,
    );

    const editedId = configuration.otherEvidenceGroups
      .flatMap((group) => group.evidenceTypes)
      .find((evidence) => evidence.label === "Sản phẩm sáng tạo đã sửa")!.id;
    configuration = duplicateOtherEvidence(configuration, editedId);
    assert.equal(getOtherEvidenceCount(configuration), countAfterCreate + 1);

    configuration = moveOtherEvidencePurpose(configuration, editedId, "manual_review");
    assert.equal(
      configuration.otherEvidenceGroups
        .find((group) => group.purpose === "manual_review")!
        .evidenceTypes.some((evidence) => evidence.label === "Sản phẩm sáng tạo đã sửa"),
      true,
    );

    configuration = deleteOtherEvidence(configuration, editedId);
    assert.equal(
      configuration.otherEvidenceGroups.some((group) =>
        group.evidenceTypes.some((evidence) => evidence.id === editedId),
      ),
      false,
    );
  });

  it("warns about malformed mandatory Khác evidence and gates draft-only controls by source", () => {
    const editor = read(
      "src/features/committee-settings/components/CriteriaConfigurationEditorPage.tsx",
    );
    const configuration = blankDraft("2036-2037");
    configuration.otherEvidenceGroups[0].evidenceTypes[0].mandatory = true;

    assert.equal(hasMalformedOtherEvidence(configuration), true);
    assert.match(editor, /readonly = draft\.status !== "draft"/);
    assert.match(editor, /Tạo bản nháp/);
    assert.match(editor, /useSaveCriteriaConfiguration/);
    assert.match(editor, /setTimeout/);
    assert.doesNotMatch(editor, /JSON editor|raw JSON|workspaceId|schoolId/);
  });
});

describe("committee criteria full validation", () => {
  it("returns structured blocking issues with navigation targets", () => {
    const configuration = clonePublished();
    configuration.criteria.volunteer.ruleGroups[0].rules[1].value = undefined;
    configuration.criteria.integration.ruleGroups[0].rules = [];

    const errors = getBlockingValidationIssues(validateCriteriaConfiguration(configuration));

    assert.equal(errors.length >= 2, true);
    assert.equal(
      errors.every((issue) => issue.section),
      true,
    );
    assert.equal(
      errors.some((issue) => issue.section === "volunteer" && issue.ruleId),
      true,
    );
    assert.equal(
      errors.some((issue) => issue.section === "integration" && issue.groupId),
      true,
    );
    assert.equal(
      errors.every((issue) => !/workspaceId|schema|JSON|ruleId/.test(issue.message)),
      true,
    );
  });

  it("blocks malformed top-level structure and unknown sixth criteria", () => {
    const configuration = clonePublished() as unknown as {
      criteria: Record<string, unknown>;
    };
    delete configuration.criteria.ethics;
    configuration.criteria.other = { ruleGroups: [] };
    configuration.criteria.extra = { ruleGroups: [] };

    const errors = getBlockingValidationIssues(validateCriteriaConfiguration(configuration));

    assert.equal(
      errors.some((issue) => issue.message.includes("bị thiếu")),
      true,
    );
    assert.equal(
      errors.some((issue) => issue.section === "other"),
      true,
    );
    assert.equal(
      errors.some((issue) => issue.message.includes("ngoài năm tiêu chí")),
      true,
    );
  });

  it("blocks numeric, count, enum, date and mandatory-Khác errors", () => {
    const configuration = clonePublished();
    const ethicsRule = configuration.criteria.ethics.ruleGroups[0].rules[0];
    ethicsRule.value = 101;
    ethicsRule.scale = 100;
    const academicRule = configuration.criteria.academic.ruleGroups[0].rules[0];
    academicRule.value = -1;
    academicRule.scale = 4;
    const volunteerRule = configuration.criteria.volunteer.ruleGroups[0].rules.find(
      (rule) => rule.type === "evidence_count",
    )!;
    volunteerRule.value = 0;
    const integrationRule = configuration.criteria.integration.ruleGroups[0].rules.find(
      (rule) => rule.type === "enum_match",
    )!;
    integrationRule.acceptedValues = [];
    configuration.criteria.physical.ruleGroups[0].rules.push({
      id: "physical-date-range-test",
      label: "Trong khoảng thời gian phù hợp",
      type: "date_range",
      operator: "exists",
      dateMode: "custom",
      startDate: "2030-08-31",
      endDate: "2030-01-01",
    });
    configuration.otherEvidenceGroups[0].evidenceTypes[0].mandatory = true;

    const messages = getBlockingValidationIssues(validateCriteriaConfiguration(configuration)).map(
      (issue) => issue.message,
    );

    assert.equal(
      messages.some((message) => message.includes("lớn hơn thang")),
      true,
    );
    assert.equal(
      messages.some((message) => message.includes("lớn hơn hoặc bằng 0")),
      true,
    );
    assert.equal(
      messages.some((message) => message.includes("số nguyên từ 1")),
      true,
    );
    assert.equal(
      messages.some((message) => message.includes("ít nhất một mức")),
      true,
    );
    assert.equal(
      messages.some((message) => message.includes("Ngày kết thúc")),
      true,
    );
    assert.equal(
      messages.some((message) => message.includes("không được đánh dấu")),
      true,
    );
  });

  it("keeps useful warnings non-blocking", () => {
    const configuration = clonePublished();
    configuration.otherEvidenceGroups = [];
    configuration.criteria.academic.ruleGroups[1].rules = [
      configuration.criteria.academic.ruleGroups[1].rules[0],
    ];

    const issues = validateCriteriaConfiguration(configuration);

    assert.equal(getBlockingValidationIssues(issues).length, 0);
    assert.equal(getWarningValidationIssues(issues).length > 0, true);
  });
});

describe("committee criteria lifecycle hardening", () => {
  it("applies a valid draft locally and makes it immutable", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);
    const draft = await repository.cloneAsDraft("criteria-dut-2025-2026-published", "2037-2038");
    await repository.save(draft);
    const published = await repository.publish(draft.id);

    assert.equal(published.status, "published");
    await assert.rejects(
      () =>
        repository.save({
          ...published,
          schoolYear: "changed",
        }),
      /Only draft/,
    );
    assert.equal((await repository.get("criteria-dut-2025-2026-published")).status, "published");
  });

  it("clones published configurations with regenerated nested IDs and blocks duplicate draft years", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);
    const source = await repository.get("criteria-dut-2025-2026-published");
    const draft = await repository.cloneAsDraft(source.id, "2038-2039");

    assert.notEqual(
      draft.criteria.ethics.ruleGroups[0].id,
      source.criteria.ethics.ruleGroups[0].id,
    );
    assert.notEqual(
      draft.criteria.ethics.ruleGroups[0].rules[0].id,
      source.criteria.ethics.ruleGroups[0].rules[0].id,
    );
    assert.notEqual(
      draft.otherEvidenceGroups[0].evidenceTypes[0].id,
      source.otherEvidenceGroups[0].evidenceTypes[0].id,
    );
    await assert.rejects(
      () => repository.cloneAsDraft(source.id, "2038-2039"),
      /Draft already exists/,
    );
  });

  it("archives only when a replacement applied configuration exists and reset restores seed", async () => {
    const storage = new MemoryStorage();
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);

    await assert.rejects(
      () => repository.archive("criteria-dut-2025-2026-published"),
      /Cannot archive/,
    );

    const draft = await repository.cloneAsDraft("criteria-dut-2025-2026-published", "2039-2040");
    const published = await repository.publish(draft.id);
    const archived = await repository.archive(published.id);

    assert.equal(archived.status, "archived");
    await repository.resetDemo();
    assert.equal((await repository.list()).length, 3);
  });

  it("continues in memory when local persistence fails", async () => {
    const storage = new FailingStorage();
    const repository = new LocalCriteriaRepository(LOCAL_CRITERIA_STORAGE_KEY, () => storage);

    const list = await repository.list();
    assert.equal(list.length, 3);
    await assert.rejects(
      () => repository.createDraft({ schoolYear: "2040-2041" }),
      /Unable to save/,
    );
    assert.equal(
      (await repository.list()).some((item) => item.schoolYear === "2040-2041"),
      true,
    );
  });
});

function clonePublished(): CriteriaConfiguration {
  return JSON.parse(
    JSON.stringify(
      DUT_CRITERIA_CONFIGURATION_SEED.find(
        (configuration) => configuration.id === "criteria-dut-2025-2026-published",
      ),
    ),
  ) as CriteriaConfiguration;
}

function blankDraft(schoolYear: string): CriteriaConfiguration {
  const seed = JSON.parse(
    JSON.stringify(DUT_CRITERIA_CONFIGURATION_SEED.find((item) => item.status === "draft")),
  ) as CriteriaConfiguration;
  return {
    ...seed,
    id: `criteria-test-${schoolYear}`,
    schoolYear,
    status: "draft",
    criteria: Object.fromEntries(
      CORE_CRITERION_KEYS.map((key) => [
        key,
        {
          ...seed.criteria[key],
          ruleGroups: [],
        },
      ]),
    ) as unknown as CriteriaConfiguration["criteria"],
  };
}

function allRuleTypeInputs(): RuleInput[] {
  return [
    {
      label: "GPA từ 3.0",
      type: "numeric_threshold",
      operator: "gte",
      value: 3,
      unit: "GPA",
      metricLabel: "GPA",
    },
    {
      label: "Không vi phạm quy chế",
      type: "boolean_condition",
      value: true,
    },
    {
      label: "Có ít nhất 3 hoạt động",
      type: "evidence_count",
      operator: "gte",
      value: 3,
      unit: "hoạt động",
      evidenceLabel: "hoạt động được xác nhận",
    },
    {
      label: "Tổng ngày tình nguyện",
      type: "evidence_sum",
      operator: "gte",
      value: 2,
      unit: "ngày",
      sumLabel: "ngày tình nguyện",
    },
    {
      label: "Có giấy xác nhận",
      type: "evidence_presence",
      evidenceLabel: "giấy xác nhận phù hợp",
    },
    {
      label: "Cấp tổ chức tối thiểu",
      type: "organizer_level",
      value: "Cấp Trường",
    },
    {
      label: "Trong năm học",
      type: "date_range",
      startDate: "2033-09-01",
      endDate: "2034-08-31",
    },
    {
      label: "Ngoại ngữ phù hợp",
      type: "enum_match",
      acceptedValues: ["A2", "B1"],
    },
    {
      label: "Hội đồng xác nhận",
      type: "manual_confirmation",
    },
  ];
}
