from typing import Literal

from pydantic import BaseModel, Field, conint, confloat, model_validator

MarginUnit = Literal["mm", "cm", "in"]
PaperFormat = Literal["A4", "Letter", "A5", "Legal", "Custom"]
DefaultAlignment = Literal["left", "center", "right", "justify"]
ChapterTitleFormat = Literal["none", "chapter-number", "chapter-number-title", "number-title", "title-only"]
ChapterTitleAlignment = Literal["left", "center", "right"]
ChapterTitleStyle = Literal["normal", "bold", "italic", "bold-italic"]

class DocumentSettings(BaseModel):
    marginTop: confloat(ge=0) = Field(..., description="Top margin in the selected unit, must be zero or positive")
    marginBottom: confloat(ge=0) = Field(..., description="Bottom margin in the selected unit, must be zero or positive")
    marginLeft: confloat(ge=0) = Field(..., description="Left margin in the selected unit, must be zero or positive")
    marginRight: confloat(ge=0) = Field(..., description="Right margin in the selected unit, must be zero or positive")
    marginUnit: MarginUnit
    paperFormat: PaperFormat
    customWidth: confloat(ge=0, le=1000) = Field(..., description="Custom page width in mm; required when paperFormat is Custom")
    customHeight: confloat(ge=0, le=1000) = Field(..., description="Custom page height in mm; required when paperFormat is Custom")
    defaultAlignment: DefaultAlignment
    defaultFont: str = Field(..., min_length=1, description="Default font family must be a non-empty string")
    defaultFontSize: conint(ge=1, le=200) = Field(..., description="Default font size in pixels must be between 1 and 200")
    chapterTitleFormat: ChapterTitleFormat
    chapterTitleSize: conint(ge=0, le=200) = Field(..., description="Chapter title font size must be zero or positive")
    chapterTitleAlignment: ChapterTitleAlignment
    chapterTitleStyle: ChapterTitleStyle
    blankLinesAfterChapter: conint(ge=0, le=10) = Field(..., description="Blank lines after chapter must be zero or positive")
    pageBreakAfterChapter: bool

    @model_validator(mode='after')
    def validate_custom_dimensions(self):
        paper_format = self.paperFormat
        custom_width = self.customWidth
        custom_height = self.customHeight

        if paper_format == "Custom":
            if custom_width is None or custom_width <= 0:
                raise ValueError("customWidth must be a positive number when paperFormat is Custom")
            if custom_height is None or custom_height <= 0:
                raise ValueError("customHeight must be a positive number when paperFormat is Custom")
        else:
            if custom_width not in (0, None):
                raise ValueError("customWidth must be 0 for non-Custom paper formats")
            if custom_height not in (0, None):
                raise ValueError("customHeight must be 0 for non-Custom paper formats")

        return self
