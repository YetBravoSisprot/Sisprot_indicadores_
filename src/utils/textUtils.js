/**
 * Utility to correct common spelling errors in data strings.
 */
export const fixSpellingErrors = (text) => {
    if (!text || typeof text !== 'string') return text;

    const substitutions = {
        'aprovado': 'aprobado',
        'Aprovado': 'Aprobado',
        'aprovada': 'aprobada',
        'Aprovada': 'Aprobada',
        'aprovacion': 'aprobación',
        'Aprovacion': 'Aprobación',
        'atrabes': 'a través',
        'ubiese': 'hubiese',
        'ubiera': 'hubiera'
    };

    let cleanedText = text;
    Object.keys(substitutions).forEach(key => {
        // Use regex with word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        cleanedText = cleanedText.replace(regex, substitutions[key]);
    });

    return cleanedText;
};
