import "../../i18n/admin";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Bold, Italic, Link2, List, ListOrdered, Heading2, Heading3, Image as ImageIcon } from "lucide-react";
import { api, type Language, type NewsInput, type NewsItem } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { AdminButton } from "../../components/admin/Button";
import { AdminCard } from "../../components/admin/Card";
import { DateTimePicker } from "../../components/admin/DateTimePicker";
import { ImageUploader } from "../../components/admin/ImageUploader";
import { Input } from "../../components/admin/Input";
import { PhonePreviewFrame } from "../../components/admin/PhonePreviewFrame";
import { Select } from "../../components/admin/Select";
import { SortableList, SortableRow } from "../../components/admin/SortableList";
import { Textarea } from "../../components/admin/Textarea";
import { Toggle } from "../../components/admin/Toggle";

const emptyNews: NewsInput = {
  title: "",
  excerpt: "",
  body: "",
  imageUrl: null,
  languageCode: "all",
  isPublished: false,
  publishedAt: null,
  sortOrder: 0,
};

export function NewsPage() {
  const { isAdmin } = useApp();
  const { t } = useTranslation("translation");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewsInput>(emptyNews);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.adminNews(), api.adminMetaLanguages()])
      .then(([rows, languageRows]) => {
        setItems(rows);
        setLanguages(languageRows);
        setSelectedId(rows[0]?.id ?? null);
        if (rows[0]) setDraft(fromNews(rows[0]));
      })
      .catch(() => {
        setItems([]);
        setLanguages([]);
      });
  }, [isAdmin]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: draft.body,
    editorProps: {
      attributes: {
        class: "admin-editor",
      },
    },
    onUpdate({ editor: nextEditor }) {
      setDraft((current) => ({ ...current, body: nextEditor.getHTML() }));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(draft.body || "");
  }, [editor, draft.body]);

  if (!isAdmin) return null;

  async function save() {
    try {
      const payload = normalizeNews(draft);
      if (selectedId) await api.adminUpdateNews(selectedId, payload);
      else await api.adminCreateNews(payload);
      const fresh = await api.adminNews();
      setItems(fresh);
      setSelectedId(fresh[0]?.id ?? null);
      setDraft(fromNews(fresh[0] ?? emptyNewsAsItem()));
      toast.success(t("toasts.newsSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.saveFailed"));
    }
  }

  async function remove(id: string) {
    try {
      await api.adminDeleteNews(id);
      const fresh = await api.adminNews();
      setItems(fresh);
      setSelectedId(fresh[0]?.id ?? null);
      setDraft(fromNews(fresh[0] ?? emptyNewsAsItem()));
      toast.success(t("toasts.newsDeleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.deleteFailed"));
    }
  }

  async function reorder(nextIds: string[]) {
    setItems(nextIds.map((id, index) => items.find((item) => item.id === id) ?? { ...(items[0] as NewsItem), id, sortOrder: index }));
    await Promise.all(nextIds.map((id, index) => api.adminUpdateNews(id, { sortOrder: index })));
    setItems(await api.adminNews());
  }

  return (
    <div className="admin-three-col">
      <AdminCard title={t("news.title")} subtitle={t("news.new")}>
        <SortableList items={items.map((item) => item.id)} onReorder={reorder}>
          {(id) => {
            const item = items.find((entry) => entry.id === id);
            if (!item) return null;
            return (
              <SortableRow id={id}>
                <button
                  type="button"
                  className={`admin-item ${selectedId === id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedId(id);
                    setDraft(fromNews(item));
                  }}
                >
                  <div className="admin-item__header">
                    <strong>{item.title}</strong>
                    <span>{item.isPublished ? t("news.published") : t("news.draft")}</span>
                  </div>
                  <p>{item.excerpt ?? item.publishedAt ?? ""}</p>
                </button>
              </SortableRow>
            );
          }}
        </SortableList>
        <AdminButton variant="primary" type="button" onClick={() => { setSelectedId(null); setDraft(emptyNews); }}>
          {t("news.new")}
        </AdminButton>
      </AdminCard>

      <AdminCard title={draft.title || t("news.title")} subtitle={t("news.content")}>
        <NewsForm
          draft={draft}
          editor={editor}
          languages={languages}
          onChange={setDraft}
          onSave={save}
          onDelete={selected ? () => void remove(selected.id) : undefined}
          onCancel={() => {
            setSelectedId(items[0]?.id ?? null);
            setDraft(fromNews(items[0] ?? emptyNewsAsItem()));
          }}
        />
      </AdminCard>

      <AdminCard title={t("preview.title")}>
        <PhonePreviewFrame>
          <article className="news-preview">
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" /> : null}
            <h3>{draft.title || t("news.headline")}</h3>
            {draft.excerpt ? <p>{draft.excerpt}</p> : null}
            <div className="news-preview__body" dangerouslySetInnerHTML={{ __html: draft.body }} />
          </article>
        </PhonePreviewFrame>
      </AdminCard>
    </div>
  );
}

function NewsForm({
  draft,
  editor,
  languages,
  onChange,
  onSave,
  onDelete,
  onCancel,
}: {
  draft: NewsInput;
  editor: Editor | null;
  languages: Language[];
  onChange(next: NewsInput): void;
  onSave(): Promise<void>;
  onDelete?: () => void;
  onCancel(): void;
}) {
  const { t } = useTranslation("translation");

  return (
    <div className="admin-form">
      <ImageUploader value={draft.imageUrl} onChange={(url) => onChange({ ...draft, imageUrl: url })} category="news" label={t("news.coverImage")} />
      <Input label={t("news.headline")} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      <Textarea label={t("news.shortSummary")} maxLength={200} value={draft.excerpt ?? ""} onChange={(event) => onChange({ ...draft, excerpt: event.target.value })} />
      <div className="admin-field">
        <span>{t("news.content")}</span>
        <div className="admin-editor-toolbar">
          <EditorButton editor={editor} action={() => editor?.chain().focus().toggleBold().run()} icon={<Bold size={14} />} label={t("editor.bold")} />
          <EditorButton editor={editor} action={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic size={14} />} label={t("editor.italic")} />
          <EditorButton editor={editor} action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={14} />} label={t("editor.heading2")} />
          <EditorButton editor={editor} action={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} icon={<Heading3 size={14} />} label={t("editor.heading3")} />
          <EditorButton editor={editor} action={() => editor?.chain().focus().toggleBulletList().run()} icon={<List size={14} />} label={t("editor.bulletList")} />
          <EditorButton editor={editor} action={() => editor?.chain().focus().toggleOrderedList().run()} icon={<ListOrdered size={14} />} label={t("editor.orderedList")} />
          <EditorButton
            editor={editor}
            action={() => {
              const href = window.prompt(t("editor.link"));
              if (!href) return;
              editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
            }}
            icon={<Link2 size={14} />}
            label={t("editor.link")}
          />
          <EditorButton
            editor={editor}
            action={() => {
              const href = window.prompt(t("editor.insertImage"));
              if (!href) return;
              editor?.chain().focus().setImage({ src: href }).run();
            }}
            icon={<ImageIcon size={14} />}
            label={t("editor.insertImage")}
          />
        </div>
        {editor ? <EditorContent editor={editor} /> : null}
      </div>
      <div className="admin-grid admin-grid--2">
        <Select
          label={t("news.language")}
          value={draft.languageCode ?? "all"}
          onChange={(value) => onChange({ ...draft, languageCode: value })}
          options={[
            { value: "all", label: t("common.all") },
            ...languages.map((language) => ({ value: language.code, label: `${language.code.toUpperCase()} · ${language.name}` })),
          ]}
        />
        <DateTimePicker
          label={t("news.published")}
          value={dateInput(draft.publishedAt)}
          onChange={(value) => onChange({ ...draft, publishedAt: parseDateInput(value) })}
        />
      </div>
      <Toggle checked={draft.isPublished} onChange={(value) => onChange({ ...draft, isPublished: value })} label={t("news.publishedOnly")} />
      <div className="admin-actions">
        <AdminButton variant="primary" type="button" onClick={() => void onSave()}>{t("common.save")}</AdminButton>
        <AdminButton variant="secondary" type="button" onClick={onCancel}>{t("common.cancel")}</AdminButton>
        {onDelete ? <AdminButton variant="danger" type="button" onClick={onDelete}>{t("common.delete")}</AdminButton> : null}
      </div>
    </div>
  );
}

function EditorButton({
  editor,
  action,
  icon,
  label,
}: {
  editor: Editor | null;
  action(): void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button type="button" className="admin-editor-toolbar__button" onClick={action} disabled={!editor} title={label}>
      {icon}
    </button>
  );
}

function normalizeNews(news: NewsInput): NewsInput {
  return {
    ...news,
    excerpt: news.excerpt || null,
    imageUrl: news.imageUrl || null,
    languageCode: news.languageCode === "all" ? null : news.languageCode,
    publishedAt: news.isPublished ? news.publishedAt || new Date().toISOString() : null,
  };
}

function fromNews(item: NewsItem): NewsInput {
  return {
    title: item.title,
    excerpt: item.excerpt ?? "",
    body: item.body,
    imageUrl: item.imageUrl,
    languageCode: item.languageCode ?? "all",
    isPublished: item.isPublished,
    publishedAt: item.publishedAt,
    sortOrder: item.sortOrder,
  };
}

function emptyNewsAsItem(): NewsItem {
  return {
    id: "",
    title: "",
    excerpt: null,
    body: "",
    imageUrl: null,
    languageCode: null,
    isPublished: false,
    publishedAt: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as NewsItem;
}

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function parseDateInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
