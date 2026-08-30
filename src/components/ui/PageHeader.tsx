type PageHeaderProps = {
  title: string;
  description: string;
};

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="border-b border-spec-border pb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-spec-text md:text-[36px]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-spec-text2 md:text-lg">
        {description}
      </p>
    </div>
  );
}
