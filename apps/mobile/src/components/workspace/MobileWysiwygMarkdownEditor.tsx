import type { MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import type { MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import { MobileMarkdownSourceEditor, type MobileMarkdownSourceEditorProps } from './MobileMarkdownSourceEditor'

type MobileWysiwygMarkdownEditorProps = MobileMarkdownSourceEditorProps & {
  layoutProbe?: MobileLayoutProbe
  wysiwygAutocompleteProbe?: boolean
  wysiwygExternalLinkProbe?: boolean
  wysiwygFormatCommandProbe?: boolean
  wysiwygInputTransformProbe?: boolean
  wysiwygMarkdownBlockProbe?: boolean
  wysiwygMathEditProbe?: boolean
  wysiwygTableCommandMutationProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
  vaultRootUri?: string | null
  typeDefinitions?: MobileTypeDefinitions
}

export function MobileWysiwygMarkdownEditor({
  layoutProbe,
  wysiwygAutocompleteProbe,
  wysiwygExternalLinkProbe,
  wysiwygFormatCommandProbe,
  wysiwygInputTransformProbe,
  wysiwygMarkdownBlockProbe,
  wysiwygMathEditProbe,
  wysiwygTableCommandMutationProbe,
  wysiwygWikilinkInsertProbe,
  wysiwygMutationProbe,
  vaultRootUri,
  typeDefinitions,
  ...props
}: MobileWysiwygMarkdownEditorProps) {
  void layoutProbe
  void wysiwygAutocompleteProbe
  void wysiwygExternalLinkProbe
  void wysiwygFormatCommandProbe
  void wysiwygInputTransformProbe
  void wysiwygMarkdownBlockProbe
  void wysiwygMathEditProbe
  void wysiwygTableCommandMutationProbe
  void wysiwygWikilinkInsertProbe
  void wysiwygMutationProbe
  void vaultRootUri
  void typeDefinitions
  return <MobileMarkdownSourceEditor {...props} />
}
