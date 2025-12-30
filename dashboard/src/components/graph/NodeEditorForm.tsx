/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [forms, knowledge-editing, validation]
 * @related: [NodeEditor.tsx, MarkdownEditor.tsx, node-schemas.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react]
 */
'use client';

import { Input } from '@/components/ui/input';
import { MarkdownEditor } from './MarkdownEditor';
import { cn } from '@/lib/utils';
import type { NodeSchema, FieldConfig } from '@/lib/node-schemas';

interface NodeEditorFormProps {
  schema: NodeSchema;
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  errors?: Record<string, string>;
}

export function NodeEditorForm({ schema, data, onChange, errors = {} }: NodeEditorFormProps) {
  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...data,
      [fieldName]: value,
    });
  };

  const renderField = (field: FieldConfig) => {
    const value = data[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.readOnly && <span className="text-muted-foreground ml-1">(read-only)</span>}
            </label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              error={!!error}
              disabled={field.readOnly}
              className={cn(
                error ? 'border-red-500' : '',
                field.readOnly ? 'bg-muted cursor-not-allowed opacity-70' : ''
              )}
            />
            {field.helperText && !error && !field.readOnly && (
              <p className="text-xs text-muted-foreground">{field.helperText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary ${
                error ? 'border-red-500' : 'border-border'
              }`}
            />
            {field.helperText && !error && (
              <p className="text-xs text-muted-foreground">{field.helperText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary bg-background ${
                error ? 'border-red-500' : 'border-border'
              }`}
            >
              <option value="">-- Select {field.label} --</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helperText && !error && (
              <p className="text-xs text-muted-foreground">{field.helperText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );

      case 'markdown':
        return (
          <div key={field.name}>
            <MarkdownEditor
              value={value}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
              label={field.label}
              placeholder={field.placeholder}
              helperText={error || field.helperText}
              required={field.required}
              minHeight="250px"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h2 className="text-xl font-mono font-semibold text-foreground">
          {schema.displayName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the required fields below to create or edit this {schema.type.toLowerCase()}.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-6">
        {schema.fields.map((field) => renderField(field))}
      </div>
    </div>
  );
}
