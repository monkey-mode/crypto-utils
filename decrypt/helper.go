package decrypt

import (
	"crypto/aes"
	"crypto/cipher"
	"os"

	"github.com/pkg/errors"
)

func (dcp *decryptAESImpl) newAEAD(key, nonce []byte) (cipher.AEAD, error) {
	cipherKey, err := aes.NewCipher(key)
	if err != nil {
		return nil, errors.Wrap(err, "create cipher key error")
	}

	return cipher.NewGCMWithNonceSize(cipherKey, len(nonce))
}

func (dcp *decryptAESImpl) buildNonce(ciphertext []byte) ([]byte, []byte) {
	nonce := ciphertext[:GCM_STANDARD_NONCE_SIZE]
	ciphertext = ciphertext[GCM_STANDARD_NONCE_SIZE:]

	return nonce, ciphertext
}

func (dcp *decryptAESImpl) validateAES256GCMKey(key []byte) error {
	if len(key) != AES_KEY_LENGTH {
		return errors.New("key must be 32 bytes")
	}

	return nil
}

func (dcp *decryptAESImpl) decrypt(key, nonce, ciphertext []byte) ([]byte, error) {
	gcm, err := dcp.newAEAD(key, nonce)
	if err != nil {
		return nil, errors.Wrap(err, "create AES256GCM error")
	}

	data, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, errors.Wrap(err, "decrypt AES256GCM error")
	}

	return data, nil
}

func (dcp *decryptAESImpl) decryptAES256GCM(key, nonce, ciphertext []byte, buildNonce bool) ([]byte, error) {
	if err := dcp.validateAES256GCMKey(key); err != nil {
		return nil, errors.Wrap(err, "validate AES256GCM key error")
	}

	if buildNonce && len(ciphertext) > GCM_STANDARD_NONCE_SIZE {
		nonce, ciphertext = dcp.buildNonce(ciphertext)
	}

	result, err := dcp.decrypt(key, nonce, ciphertext)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (dcp *decryptAESImpl) decryptFileAES256GCM(key, nonce []byte, inputFilePath, outputFilePath string, buildNonce bool) error {
	if err := dcp.validateAES256GCMKey(key); err != nil {
		return errors.Wrap(err, "validate AES256GCM key error")
	}

	if err := dcp.decryptFile(key, nonce, inputFilePath, outputFilePath, buildNonce); err != nil {
		return err
	}

	return nil
}

func (dcp *decryptAESImpl) decryptFile(key, nonce []byte, inputFilePath, outputFilePath string, buildNonce bool) error {
	ciphertext, err := os.ReadFile(inputFilePath)
	if err != nil {
		return errors.Wrap(err, "read source file error")
	}

	if buildNonce && len(ciphertext) > GCM_STANDARD_NONCE_SIZE {
		nonce, ciphertext = dcp.buildNonce(ciphertext)
	}

	data, err := dcp.decrypt(key, nonce, ciphertext)
	if err != nil {
		return err
	}

	if err := os.WriteFile(outputFilePath, data, FILE_PERMISSION); err != nil {
		return errors.Wrap(err, "write decrypt file error")
	}

	return nil
}
