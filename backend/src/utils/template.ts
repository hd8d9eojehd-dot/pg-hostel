// Minimal HTML template helper — replaces {{key}} placeholders
export function renderTemplate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key]
    return val !== undefined ? String(val) : `{{${key}}}`
  })
}
