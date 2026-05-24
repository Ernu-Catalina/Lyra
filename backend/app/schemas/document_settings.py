from typing import Literal, Optional

from pydantic import BaseModel, Field, conint, confloat, model_validator

MarginUnit = Literal["mm", "cm", "in"]
PaperFormat = Literal["A4", "Letter", "A5", "Legal", "Custom"]
DefaultAlignment = Literal["left", "center", "right", "justify"]
ChapterTitleFormat = Literal["none", "chapter-number", "chapter-number-title", "number-title", "title-only"]
ChapterTitleAlignment = Literal["left", "center", "right"]
ChapterTitleStyle = Literal["normal", "bold", "italic", "bold-italic"]
PageNumberPosition = Literal["left", "center", "right", "alternating", "none"]
PageNumberFormat = Literal["number", "number-of-total", "roman"]

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
    defaultLineHeight: confloat(ge=0.5, le=5.0) = Field(..., description="Default line height multiplier")
    defaultParagraphSpacing: conint(ge=0, le=32) = Field(..., description="Default paragraph spacing in points (pt)")
    defaultFont: str = Field(..., min_length=1, description="Default font family must be a non-empty string")
    defaultFontSize: conint(ge=1, le=200) = Field(..., description="Default font size in pixels must be between 1 and 200")
    defaultFirstLineIndent: confloat(ge=0) = Field(..., description="Default first line indent must be zero or positive")
    defaultFirstLineIndentUnit: MarginUnit
    chapterTitleFormat: ChapterTitleFormat
    chapterTitleSize: conint(ge=0, le=200) = Field(..., description="Chapter title font size must be zero or positive")
    chapterTitleAlignment: ChapterTitleAlignment
    chapterTitleStyle: ChapterTitleStyle
    blankLinesAfterChapter: conint(ge=0, le=10) = Field(..., description="Blank lines after chapter must be zero or positive")
    blankLinesAfterSpecialChapter: conint(ge=0, le=10) = Field(1, description="Blank lines after special chapter title (Prologue, Epilogue, etc.)")
    pageBreakAfterChapter: bool
    includePrologue: bool = Field(False, description="Include prologue section in document rendering")
    includeEpilogue: bool = Field(False, description="Include epilogue section in document rendering")
    includeAcknowledgements: bool = Field(False, description="Include acknowledgements section in document rendering")
    showSceneTitles: bool = Field(False, description="Show scene titles in compiled output")
    sceneTitleSize: conint(ge=6, le=200) = Field(13, description="Scene title font size in pt")
    sceneTitleAlignment: ChapterTitleAlignment = Field("left", description="Scene title alignment")
    sceneTitleStyle: ChapterTitleStyle = Field("bold", description="Scene title font style")
    blankLinesAfterSceneTitle: conint(ge=0, le=10) = Field(0, description="Blank lines after scene title")
    pageBreakAfterSceneTitle: bool = Field(False, description="Insert page break before each scene when titles are shown")
    # Headers
    showHeader: bool = Field(False, description="Show header on every page")
    headerLeft: str = Field("", description="Left-aligned header content (supports {title}, {author}, {page}, {totalPages})")
    headerCenter: str = Field("{title}", description="Center-aligned header content")
    headerRight: str = Field("", description="Right-aligned header content")
    headerFontSize: conint(ge=6, le=72) = Field(10, description="Header font size in pt")
    # Footers
    showFooter: bool = Field(False, description="Show footer on every page")
    footerLeft: str = Field("", description="Left-aligned footer content")
    footerCenter: str = Field("", description="Center-aligned footer content")
    footerRight: str = Field("", description="Right-aligned footer content")
    footerFontSize: conint(ge=6, le=72) = Field(10, description="Footer font size in pt")
    # Page Numbers
    showPageNumbers: bool = Field(False, description="Show page numbers")
    pageNumberPosition: PageNumberPosition = Field("center", description="Page number position")
    pageNumberStart: conint(ge=0) = Field(1, description="Starting page number")
    pageNumberFormat: PageNumberFormat = Field("number", description="Page number format")
    pageNumberFontSize: conint(ge=6, le=72) = Field(10, description="Page number font size in pt")

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
